# Cloud Sync Setup

DailyPlanner cloud sync uses Supabase email OTP auth and a two-person household model. If `EXPO_PUBLIC_SUPABASE_URL` or `EXPO_PUBLIC_SUPABASE_ANON_KEY` is missing, the app safely disables cloud sync and continues working locally.

## 5-minute setup

1. Create a Supabase project at https://supabase.com.
2. Open **SQL Editor** in the Supabase dashboard.
3. Paste and run `supabase/migrations/0001_init.sql`.
4. Paste and run `supabase/migrations/0002_guvenlik_sertlestirme.sql` (invite code expiry, member limit, backup delete policy). It is idempotent and can be re-run safely.
5. Paste and run `supabase/migrations/0003_sync_birlestirme.sql` (race-safe member limit, backup deletion marker). It requires 0002 and refuses to run without it. Idempotent.
   **If you ever re-run 0002 afterwards, run 0003 again right after it:** both files define `join_household`, and the 0002 version silently drops the `for update` lock that 0003 adds.
6. Copy the project URL from **Project Settings → API**.
7. Copy the anon public key from **Project Settings → API**.
8. Add EAS project secrets:

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
- Sync **merges** instead of overwriting. Before writing, the device reads the cloud row and runs a three-way merge (last synced snapshot / local / cloud) in `src/utils/syncMerge.ts`; the merged result is written to the cloud **and** applied locally.
- Merge rules: only one side changed → that side wins; both changed the same task → newer `Task.updatedAt` wins, and with no usable timestamp a deterministic content rule picks the same winner on both devices; delete vs. edit → the edit is kept; a delete propagates only when the other side did not touch the record; with no local base snapshot nothing is deleted; pomodoro counters take the per-day maximum; settings and profile merge field by field with local edits winning.
- Writes are conditional on the cloud row version that was merged (`updated_at`); if the partner wrote in between, the device re-reads, re-merges and retries (up to three attempts) instead of overwriting.
- **Buluttan Geri Yükle** is the one destructive action left: it replaces local data with the cloud copy. **Şimdi Yedekle** merges.
- After **Bulut Yedeğini Sil**, automatic background backup stays paused (a deletion marker in `plan_backup_deletions` plus a local flag) until someone taps **Şimdi Yedekle**; otherwise the next background transition would silently recreate the row.
- Manual actions are available: **Şimdi Yedekle** and **Buluttan Geri Yükle**.
- The app silently backs up on `AppState` background when the user is signed in and paired.
- Boot never auto-restores over local data; it only checks whether a cloud backup exists.
- Realtime sync is not included in v1. It is a future enhancement.

## Known limits

- **Task order does not converge between devices.** The merge keeps the local order and appends tasks that only exist in the cloud; there is no order field to reconcile.
- **Moving a task to another day while the partner edits it on the old day leaves the task on both days.** Base `D1:[task]`, device A moves it to `D2`, device B edits it in place on `D1` → the merge yields `{D2: [task], D1: [task as edited by B]}`. This is the direct consequence of "an edit beats a delete": the move looks like a delete on `D1` and B's edit protects it. If the partner did not touch the task, the move is clean and only `D2` remains. Delete the leftover copy manually if it happens.
- **Conflicting edits to the same task lose one side's version** (the newer `updatedAt` wins, or a deterministic content rule when timestamps cannot decide). Nothing is silently merged field by field inside a single task.
- **Recurring tasks written by app versions older than the `updatedAt` stamp** fall back to the deterministic content rule instead of "newest wins".

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
10. On device A, tap **Şimdi Yedekle** and confirm the merge.
11. On device B, tap **Buluttan Geri Yükle** and confirm local overwrite.
12. Verify device B now shows device A's backed-up plans, settings, recurring tasks, about-me text, and pomodoro stats.
13. Put device B in the background, then check Supabase `plan_backups.updated_at` changes after silent backup.
14. Disable or remove the env vars in a local build and verify Settings shows the setup-required state and the app does not crash.
15. Try an invalid invite code and verify the UI shows an error without changing local data.
16. Try an expired invite code (or set `invite_code_expires_at` to a past timestamp in the dashboard) and verify the join is rejected with the "süresi dolmuş" message.
17. On device A tap **Yeni Kod Oluştur**, verify a new code and a new expiry appear, and that the old code no longer works.
18. With both devices paired, sign in with a third account and try the code; verify it is rejected because the household is full.
19. On device A tap **Bulut Yedeğini Sil**, confirm, and verify `plan_backups` no longer has the household row while local plans stay intact.
20. **Invite code rotation targets the current household (R2-001):** on the creator device leave the pairing (**Eşleştirmeden Ayrıl**), reopen Settings so a new household is auto-created, then tap **Yeni Kod Oluştur**. The code on screen must change and `select id, invite_code, invite_code_expires_at, created_by from public.households order by created_at;` must show only the household you are a member of updated.
21. **Merge, different days:** on device A add a task on one day, on device B add a task on another day (both offline of each other), then background both. Both days must exist on both devices and in `plan_backups.data`.
22. **Merge, same day:** repeat with both devices adding a different task to the *same* day; both tasks must survive.
23. **Delete propagation:** with both devices synced, delete a task on device A, background it, then background device B. The task must disappear on B as well.
24. **Delete vs. edit:** delete a task on device A while device B edits the same task before either syncs; after both sync the edited task must still exist.
25. **Deleted backup stays deleted (R2-006):** tap **Bulut Yedeğini Sil**, background the app, and verify `plan_backups` is still empty. Then tap **Şimdi Yedekle** and verify the row (and `plan_backup_deletions` cleanup) happens only after the explicit action.
26. **Member limit race (R2-003):** optional — call `join_household` twice concurrently with the same full household and verify only the allowed number of members exists.

## Troubleshooting

- OTP email not received: check Supabase Auth email settings and spam folders.
- Sync buttons disabled: verify both users are in the same household and `plan_backups` RLS migration ran.
- Restore has no data: create a backup first from the paired partner device.
- Delete backup reports "Veritabanında silme yetkisi tanımlı değil": run `supabase/migrations/0002_guvenlik_sertlestirme.sql`.
- Delete backup reports "Silinecek Yedek Yok": no cloud row is visible for this household — check that both devices are in the same household.
- Automatic backup seems stuck after a deletion: this is by design. Tap **Şimdi Yedekle** once to clear the deletion marker (`plan_backup_deletions`).
- `0003` fails with "Önce 0002_guvenlik_sertlestirme.sql çalıştırılmalı": run 0002 first, then re-run 0003.
