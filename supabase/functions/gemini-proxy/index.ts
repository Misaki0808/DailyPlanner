// ============================================================================
// gemini-proxy · Supabase Edge Function (Deno)
// ============================================================================
// Gemini API anahtarı istemci paketine gömülmesin diye AI çağrıları buradan
// geçer: anahtar yalnız sunucuda, function secret'ı olarak durur.
//
// İstemci sözleşmesi (src/utils/aiService.ts):
//   POST /functions/v1/gemini-proxy
//   Authorization: Bearer <SUPABASE_ANON_KEY>
//   { "contents": [...], "generationConfig": {...}, "model": "gemini-2.5-flash" }
//   -> Gemini'nin generateContent yanıtı, üst kaynağın durum koduyla birlikte.
//
// Anahtar tanımlı değilse 503 döner; istemci bunu "vekil hazır değil" olarak
// okuyup eski doğrudan yola düşer (geriye uyum).
//
// Dağıtım ve doğrulama adımları: docs/AI_PROXY_SETUP.md
// Bu dosya Deno'da çalışır; uygulamanın tsc/eslint kapsamı dışında tutulur.
// ============================================================================

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.5-flash';
/** Yalnız bilinen modellere izin verilir: vekil açık uçlu bir geçit olmasın. */
const ALLOWED_MODELS = new Set([DEFAULT_MODEL, 'gemini-2.5-flash-lite', 'gemini-2.0-flash']);
/** Kaba bir üst sınır: aşırı büyük istekler kotayı tüketmesin. */
const MAX_BODY_BYTES = 200_000;

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });

const errorResponse = (message: string, status: number) =>
  jsonResponse({ error: { message, status } }, status);

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (request.method !== 'POST') {
    return errorResponse('Yalnız POST destekleniyor.', 405);
  }

  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    // İstemci bunu "vekil hazır değil" sayıp doğrudan yola düşer.
    return errorResponse('GEMINI_API_KEY tanımlı değil (function secret).', 503);
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return errorResponse('İstek gövdesi çok büyük.', 413);
  }

  let payload: { model?: string; contents?: unknown; generationConfig?: unknown };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return errorResponse('Gövde geçerli JSON değil.', 400);
  }

  if (!Array.isArray(payload?.contents) || payload.contents.length === 0) {
    return errorResponse('`contents` alanı zorunlu.', 400);
  }

  const model = typeof payload.model === 'string' && payload.model ? payload.model : DEFAULT_MODEL;
  if (!ALLOWED_MODELS.has(model)) {
    return errorResponse(`Desteklenmeyen model: ${model}`, 400);
  }

  try {
    const upstream = await fetch(`${GEMINI_BASE_URL}/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Anahtar sorgu dizesi yerine başlıkta: log ve yönlendirmelerde sızmasın.
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: payload.contents,
        generationConfig: payload.generationConfig ?? {},
      }),
    });

    // Durum kodu olduğu gibi aktarılır: 429 (kota) ve 5xx istemcideki mevcut
    // yeniden deneme/hata akışlarına doğru yansısın.
    const responseText = await upstream.text();
    return new Response(responseText, {
      status: upstream.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Gemini isteği başarısız:', error);
    return errorResponse('Yapay zeka servisine ulaşılamadı.', 502);
  }
});
