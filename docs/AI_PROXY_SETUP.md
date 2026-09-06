# AI Proxy Setup (Gemini)

`EXPO_PUBLIC_`-prefixed values are compiled into the client bundle, so a Gemini key shipped that way is effectively public. The proxy moves the key to the server: the app calls a Supabase Edge Function, the function calls Gemini with a key that only exists as a function secret.

**The proxy is optional.** With `EXPO_PUBLIC_AI_PROXY_URL` unset the app keeps using the direct key exactly as before, so nothing breaks until you deploy.

## What the app does

| `EXPO_PUBLIC_AI_PROXY_URL` | `EXPO_PUBLIC_GEMINI_API_KEY` | Behaviour |
|---|---|---|
| set | unset | All AI calls go through the proxy. **Target state.** |
| set | set | Proxy first; falls back to the direct key only if the proxy is missing (404), not configured (503/501) or unreachable. |
| unset | set | Direct calls, today's behaviour. |
| unset | unset | AI features are off; paragraph conversion falls back to local parsing. |

Quota (429) and server errors are passed through with their status codes, so the existing retry and error messages keep working.

## Deploy

1. Install the CLI and log in (once):
   ```bash
   npm install -g supabase
   supabase login
   supabase link --project-ref <project-ref>
   ```
2. Store the Gemini key as a **function secret** (never in `.env`, `eas.json` or git):
   ```bash
   supabase secrets set GEMINI_API_KEY=<gemini_key>
   ```
3. Deploy the function from the repo root:
   ```bash
   supabase functions deploy gemini-proxy
   ```
   Dashboard alternative: **Edge Functions → Deploy new function**, name it `gemini-proxy`, paste `supabase/functions/gemini-proxy/index.ts`, then add the `GEMINI_API_KEY` secret under **Edge Functions → Secrets**.
4. Point the app at it. Either the full function URL or just the project URL works:
   ```properties
   EXPO_PUBLIC_AI_PROXY_URL=https://<project-ref>.supabase.co
   ```
   For EAS builds:
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_AI_PROXY_URL --value https://<project-ref>.supabase.co
   ```
   The client appends `/functions/v1/gemini-proxy` when the value has no `/functions/` segment, and sends `EXPO_PUBLIC_SUPABASE_ANON_KEY` as the `Authorization` bearer (the function keeps Supabase's default JWT verification).

## Verify

```bash
curl -i -X POST "https://<project-ref>.supabase.co/functions/v1/gemini-proxy" \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Tek kelimeyle cevap ver: merhaba"}]}]}'
```

- `200` with a `candidates[0].content.parts[0].text` field → the proxy works.
- `503 GEMINI_API_KEY tanımlı değil` → step 2 was skipped; the app still falls back to the direct key.
- `401` → the `Authorization` header is missing or the anon key is wrong.

In the app: run **Ayarlar → Haftalık AI Özeti** (or paragraph conversion) and confirm a new invocation appears under **Edge Functions → gemini-proxy → Logs**.

## Rotate the exposed key (do this after the proxy works)

The old key was shipped in client bundles and the repo is public, so it must be replaced, not just hidden.

1. Create a **new** key in [Google AI Studio](https://aistudio.google.com/) and set it on the server only: `supabase secrets set GEMINI_API_KEY=<new_key>`.
2. Redeploy if the dashboard requires it: `supabase functions deploy gemini-proxy`.
3. Verify with the curl call above.
4. Remove the client key everywhere:
   - delete `EXPO_PUBLIC_GEMINI_API_KEY` from local `.env` files,
   - `eas secret:delete --scope project --name EXPO_PUBLIC_GEMINI_API_KEY`,
   - make a new build so no released bundle carries the key.
5. **Delete the old key** in Google AI Studio. Until this step the exposed key stays usable by anyone who has it.
6. Optional hardening: restrict the new key to the Generative Language API, and watch quota usage for a few days.

## Notes

- The function only forwards `contents` / `generationConfig` and rejects unknown models, so it is not an open relay.
- It runs on Deno and is excluded from the app's TypeScript and ESLint runs (`tsconfig.json`, `.eslintrc.js`).
- Anyone holding the public anon key can call the function; it protects the Gemini key, not the quota. Add per-user rate limiting there if abuse shows up.
