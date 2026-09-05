# Cloud Sync Setup

DailyPlanner cloud sync uses Supabase email OTP auth and a two-person household model. If `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_ANON_KEY` is missing, the app safely disables cloud sync and continues working locally.

## 5-minute setup

1. Create a Supabase project at https://supabase.com.
2. Open **SQL Editor** in the Supabase dashboard.
3. Paste and run `supabase/migrations/0001_init.sql`.
4. Paste and run `supabase/migrations/0002_guvenlik_sertlestirme.sql` (invite code expiry, member limit, backup delete policy). It is idempotent and can be re-run safely.
5. Copy the project URL from **Project Settings → API**.
6. Copy the anon public key from **Project Settings → API**.
7. Add EAS project secrets:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value <url>
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon_key>
```

For local development, put the same values in `.env`:

```bash
EXPO_PUBLIC_SUPABASE_URL=<url>
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

Do not commit `.env` or any Supabase key values.

## Product behavior

- Auth is passwordless Supabase email OTP.
- The first signed-in user gets a 6-character invite code.
- An invite code is valid for 24 hours (`public.invite_code_ttl()`); the creator can mint a new one with **Yeni Kod Oluştur**.
- A household holds at most 2 members (`public.household_member_limit()`); a third join attempt is rejected by `join_household`.
- A partner joins with that invite code.
- Both users share one household backup row.
- Either member can delete the shared backup with **Bulut Yedeğini Sil**; the confirmation states that the partner loses it too. Local data is never touched.
- Only the household creator can update the `households` row (invite code rotation).
- Sync is whole-blob last-write-wins.
- Manual actions are available: **Şimdi Yedekle** and **Buluttan Geri Yükle**.
- The app silently backs up on `AppState` background when the user is signed in and paired.
- Boot never auto-restores over local data; it only checks whether a cloud backup exists.
- Realtime sync is not included in v1. It is a future enhancement.

## Manual test plan

1. Install a dev build or production build with the two Expo public env vars set.
2. Open the app on device A.
3. Go to Settings → Cloud Sync.
4. Enter account A email, tap **Kod Gönder**, then enter the 6-digit OTP and tap **Doğrula**.
5. Confirm an invite code appears.
6. Open the app on device B or a second simulator.
7. Sign in with account B using email OTP.
8. Enter account A's invite code on device B and tap **Eşleştir**.
9. On device A, create or edit plans, settings, recurring tasks, about-me text, and pomodoro stats.
10. On device A, tap **Şimdi Yedekle** and confirm overwrite.
11. On device B, tap **Buluttan Geri Yükle** and confirm local overwrite.
12. Verify device B now shows device A's backed-up plans, settings, recurring tasks, about-me text, and pomodoro stats.
13. Put device B in the background, then check Supabase `plan_backups.updated_at` changes after silent backup.
14. Disable or remove the env vars in a local build and verify Settings shows the setup-required state and the app does not crash.
15. Try an invalid invite code and verify the UI shows an error without changing local data.
16. Try an expired invite code (or set `invite_code_expires_at` to a past timestamp in the dashboard) and verify the join is rejected with the "süresi dolmuş" message.
17. On device A tap **Yeni Kod Oluştur**, verify a new code and a new expiry appear, and that the old code no longer works.
18. With both devices paired, sign in with a third account and try the code; verify it is rejected because the household is full.
19. On device A tap **Bulut Yedeğini Sil**, confirm, and verify `plan_backups` no longer has the household row while local plans stay intact.

## Troubleshooting

- OTP email not received: check Supabase Auth email settings and spam folders.
- Sync buttons disabled: verify both users are in the same household and `plan_backups` RLS migration ran.
- Restore has no data: create a backup first from the paired partner device.
- Delete backup reports "Veritabanında silme yetkisi tanımlı değil": run `supabase/migrations/0002_guvenlik_sertlestirme.sql`.
