-- ============================================================================
-- DailyPlanner · 0003 · Senkron birleştirme desteği (DP-005) + R2-003
-- ============================================================================
-- SIRA: 0001_init.sql → 0002_guvenlik_sertlestirme.sql → BU DOSYA.
-- Supabase Dashboard → SQL Editor'da bir kez çalıştırın. Dosya idempotenttir;
-- tekrar çalıştırmak güvenlidir.
--
-- Kapsam:
--   R2-003   join_household üye sayımı yarışa dayanıklı (hane satırı kilitli)
--   R2-006   Silinen yedeğin otomatik yedeklemeyle dirilmesini engelleyen
--            silme işareti (tombstone) tablosu
--
-- Birleştirmenin kendisi istemcide yapılır (src/utils/syncMerge.ts) ve yeni
-- kolon gerektirmez; uygulama bu migration UYGULANMADAN da çalışır: silme
-- işareti tablosu yoksa istemci yalnız yerel işaretle yetinir.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- Ön koşul: 0002 uygulanmış olmalı. Kısmi uygulama sessizce yarım bir şema
-- bırakmasın diye açık hata veriyoruz.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regprocedure('public.household_member_limit()') is null then
    raise exception 'Önce 0002_guvenlik_sertlestirme.sql çalıştırılmalı (household_member_limit bulunamadı).';
  end if;
end
$$;


-- ---------------------------------------------------------------------------
-- R2-003 · Üye limiti sayımı artık yarışa dayanıklı
-- ---------------------------------------------------------------------------
-- Sayım ile insert arasında ikinci bir katılma isteği araya girip limiti
-- aşabiliyordu (household_members üzerindeki unique(user_id) bunu engellemez;
-- iki FARKLI kullanıcı aynı haneye girer). Hane satırı davet kodu aranırken
-- `for update` ile kilitlenir: aynı haneye eşzamanlı katılma istekleri sıraya
-- girer ve ikincisi güncel sayımı görür.
--
-- Gövdenin geri kalanı 0002'deki ile aynıdır (süre + limit + idempotent katılım).
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
  limit 1
  for update;

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
-- R2-006 · Silme işareti (tombstone)
-- ---------------------------------------------------------------------------
-- Kullanıcı ortak yedeği sildikten sonra, içerik taşıyan eşleşmiş bir cihazın
-- ilk arka plana geçişi satırı yeniden oluşturuyordu: silme niyeti dakikalar
-- içinde kendiliğinden geri alınmış gibi görünüyordu.
--
-- Yedek verisi GERÇEKTEN silinir (gizlilik); burada yalnız "silindi" bilgisi
-- durur. İstemci bu işaret varken OTOMATİK yedeklemeyi atlar; kullanıcı
-- "Şimdi Yedekle" derse işaret kalkar ve yedekleme normal sürer.
create table if not exists public.plan_backup_deletions (
  household_id uuid primary key references public.households(id) on delete cascade,
  deleted_at timestamptz not null default now(),
  deleted_by uuid not null references auth.users(id) on delete cascade
);

alter table public.plan_backup_deletions enable row level security;

drop policy if exists "plan_backup_deletions_select_members" on public.plan_backup_deletions;
create policy "plan_backup_deletions_select_members"
on public.plan_backup_deletions
for select
to authenticated
using (public.is_household_member(household_id, auth.uid()));

drop policy if exists "plan_backup_deletions_insert_members" on public.plan_backup_deletions;
create policy "plan_backup_deletions_insert_members"
on public.plan_backup_deletions
for insert
to authenticated
with check (public.is_household_member(household_id, auth.uid()) and deleted_by = auth.uid());

drop policy if exists "plan_backup_deletions_update_members" on public.plan_backup_deletions;
create policy "plan_backup_deletions_update_members"
on public.plan_backup_deletions
for update
to authenticated
using (public.is_household_member(household_id, auth.uid()))
with check (public.is_household_member(household_id, auth.uid()) and deleted_by = auth.uid());

-- Silme işareti, yeniden yedeklemek isteyen kullanıcı tarafından kaldırılabilir.
drop policy if exists "plan_backup_deletions_delete_members" on public.plan_backup_deletions;
create policy "plan_backup_deletions_delete_members"
on public.plan_backup_deletions
for delete
to authenticated
using (public.is_household_member(household_id, auth.uid()));


-- ---------------------------------------------------------------------------
-- Yetkiler
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on public.plan_backup_deletions to authenticated;
grant execute on function public.join_household(text) to authenticated;
