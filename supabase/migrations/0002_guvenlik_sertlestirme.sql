-- ============================================================================
-- DailyPlanner · 0002 · Bulut güvenlik sertleştirmesi (R-009 / R-010 / R-011)
-- ============================================================================
-- 0001_init.sql çalıştırıldıktan SONRA, Supabase Dashboard → SQL Editor'da bir
-- kez çalıştırın. Dosya idempotenttir; tekrar çalıştırmak güvenlidir.
--
-- DİKKAT (R2-008): Bu dosyayı 0003'ten SONRA yeniden çalıştırırsan hemen
-- ardından 0003_sync_birlestirme.sql dosyasını da çalıştır. join_household
-- burada da tanımlı ve buradaki sürüm, 0003'ün eklediği `for update` kilidini
-- (eşzamanlı katılmada üye limiti yarışı) sessizce geri alır.
--
-- Kapsam:
--   R-009  plan_backups için DELETE politikası (yalnız o hanenin üyeleri)
--   R-010  Davet kodlarına geçerlilik süresi + hane başına üye limiti
--   R-011  households UPDATE yetkisinin yalnız kurucuya daraltılması
--
-- Uygulama bu migration UYGULANMADAN da çalışmaya devam eder: istemci yeni
-- kolon/RPC yoksa eski davranışa döner (bkz. src/services/pairing.ts).
-- ============================================================================


-- ---------------------------------------------------------------------------
-- Ayarlanabilir sabitler — TEK KAYNAK.
-- Limitleri değiştirmek için yalnız bu iki fonksiyonu düzenleyip dosyayı
-- yeniden çalıştırmak yeterlidir; aşağıdaki kolon varsayılanı ve RPC'ler değeri
-- buradan okur. İstemci tarafındaki karşılıkları:
--   INVITE_CODE_TTL_HOURS ve HOUSEHOLD_MEMBER_LIMIT (src/services/pairing.ts)
-- ---------------------------------------------------------------------------
create or replace function public.invite_code_ttl()
returns interval
language sql
immutable
as $$
  select interval '24 hours';
$$;

create or replace function public.household_member_limit()
returns integer
language sql
immutable
as $$
  select 2;
$$;


-- ---------------------------------------------------------------------------
-- R-010 · Davet kodu geçerlilik süresi
-- ---------------------------------------------------------------------------
-- Kolon NOT NULL + varsayılanlı eklenir; böylece istemci hiçbir şey yazmasa da
-- her yeni hane 24 saatlik kodla oluşur.
--
-- GERİYE DÖNÜK UYUM KARARI: mevcut (süresiz) satırlar migration anında
-- now() + 24 saat değerini alır, yani eski kodlar anında geçersizleşmez; devam
-- eden bir eşleştirme kilitlenmeden 24 saat daha çalışır, sonrasında normal
-- kural işler. Anında geçersiz kılmak, kodu ekranda bekleyen bir kullanıcıyı
-- uygulama içinden çıkışı olmayan bir duruma sokardı.
alter table public.households
  add column if not exists invite_code_expires_at timestamptz
  not null default (now() + public.invite_code_ttl());


-- ---------------------------------------------------------------------------
-- R-010 · join_household: süresi dolmuş kod ve dolu hane reddedilir
-- ---------------------------------------------------------------------------
-- security definer olduğu için üye sayımı RLS'e takılmaz. Zaten üye olan
-- kullanıcı limit kontrolüne takılmaz; tekrar katılma idempotent kalır.
create or replace function public.join_household(p_invite_code text)
returns table (household_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_household_id uuid;
  target_expires_at timestamptz;
  current_user_id uuid;
  member_count integer;
  already_member boolean;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select h.id, h.invite_code_expires_at
  into target_household_id, target_expires_at
  from public.households h
  where h.invite_code = upper(trim(p_invite_code))
  limit 1;

  if target_household_id is null then
    raise exception 'invalid_invite_code' using errcode = '22023';
  end if;

  if target_expires_at is not null and target_expires_at <= now() then
    raise exception 'invite_code_expired' using errcode = '22023';
  end if;

  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = target_household_id
      and hm.user_id = current_user_id
  )
  into already_member;

  if not already_member then
    select count(*)
    into member_count
    from public.household_members hm
    where hm.household_id = target_household_id;

    if member_count >= public.household_member_limit() then
      raise exception 'household_full' using errcode = '23514';
    end if;
  end if;

  -- Niteliksiz household_id, RETURNS TABLE'dan gelen OUT parametresiyle aynı
  -- ada sahip; takma ad ile kolon olduğu açıkça belirtiliyor (0001'de yoktu).
  delete from public.household_members hm
  where hm.user_id = current_user_id
    and hm.household_id <> target_household_id;

  insert into public.household_members (household_id, user_id)
  values (target_household_id, current_user_id)
  on conflict (household_id, user_id) do nothing;

  return query select target_household_id;
end;
$$;


-- ---------------------------------------------------------------------------
-- R-010 / R-011 · Kod yenileme yalnız kurucuya açık bir RPC üzerinden
-- ---------------------------------------------------------------------------
-- Kodu süresi dolan kurucunun eşleştirmeyi tamamlayabilmesi için bir yenileme
-- yolu şart. Kodu istemci üretir (karıştırılabilir harfleri dışarıda bırakan
-- alfabe tek yerde, pairing.ts içinde kalsın diye); yeni son kullanma zamanını
-- ve yetki kontrolünü sunucu belirler, cihaz saatine güvenilmez.
-- Benzersizlik çakışmasında 23505 döner; istemci yeni kodla tekrar dener.
-- Dönen id istemcide mevcut hane ile karşılaştırılır (ikinci savunma).
create or replace function public.rotate_invite_code(p_invite_code text)
returns table (id uuid, invite_code text, invite_code_expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  target_household_id uuid;
  normalized_code text;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  normalized_code := upper(trim(p_invite_code));
  if normalized_code !~ '^[A-Z0-9]{6}$' then
    raise exception 'invalid_invite_code' using errcode = '22023';
  end if;

  -- Hedef hane çağıranın ÜYELİĞİNDEN çözülür; household_members.user_id üzerinde
  -- tekillik kısıtı olduğu için bu en fazla bir satır verir ve istemcinin
  -- gördüğü hane ile aynıdır (getMyHousehold da üyelikten çözüyor). Kuruculuk
  -- şartı bunun üstünde korunur (R-011).
  --
  -- Önceki hâli yalnız `created_by = auth.uid() limit 1` idi: kimsesiz hane
  -- satırları hiç silinmediği için (ayrılan kurucuya arayüz yeni hane açıyor)
  -- RPC kullanıcının BAŞKA bir hanesini yenileyebiliyordu; ekranda süresi
  -- dolmuş kod kalıyor, başka hanenin canlı kodu habersiz geçersizleşiyordu.
  select h.id
  into target_household_id
  from public.households h
  join public.household_members hm
    on hm.household_id = h.id
   and hm.user_id = current_user_id
  where h.created_by = current_user_id;

  if target_household_id is null then
    raise exception 'not_household_creator' using errcode = '42501';
  end if;

  update public.households h
     set invite_code = normalized_code,
         invite_code_expires_at = now() + public.invite_code_ttl()
   where h.id = target_household_id;

  return query
  select h.id, h.invite_code, h.invite_code_expires_at
  from public.households h
  where h.id = target_household_id;
end;
$$;


-- ---------------------------------------------------------------------------
-- R-011 · households UPDATE: her üye değil, yalnız kurucu
-- ---------------------------------------------------------------------------
-- Eski politika (households_update_members) her üyeye sınırsız UPDATE veriyor,
-- invite_code ve created_by alanları da buna dahildi. WITH CHECK koşulu
-- kurucunun haneyi başkasına devretmesini de engeller.
drop policy if exists "households_update_members" on public.households;

drop policy if exists "households_update_creator" on public.households;
create policy "households_update_creator"
on public.households
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());


-- ---------------------------------------------------------------------------
-- R-009 · Bulut yedeğini silme
-- ---------------------------------------------------------------------------
-- 0001'de plan_backups için select/insert/update vardı, delete yoktu; kullanıcı
-- ortak yedeğini silemiyordu. Yedek hanenin ORTAK yedeği olduğu için silme
-- yetkisi hane üyeleriyle sınırlı (uygulamada da eşi etkilediğini açıkça
-- söyleyen bir onay diyaloğu var).
drop policy if exists "plan_backups_delete_members" on public.plan_backups;
create policy "plan_backups_delete_members"
on public.plan_backups
for delete
to authenticated
using (public.is_household_member(household_id, auth.uid()));


-- ---------------------------------------------------------------------------
-- Yetkiler
-- ---------------------------------------------------------------------------
grant execute on function public.join_household(text) to authenticated;
grant execute on function public.rotate_invite_code(text) to authenticated;
grant execute on function public.invite_code_ttl() to authenticated;
grant execute on function public.household_member_limit() to authenticated;
