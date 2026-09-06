import Constants from 'expo-constants';
import { Task } from '../types';
import { TASK_CATEGORIES } from './categories';

// Sağlayıcı/model değiştirmek için TEK yer burası.
const AI_CONFIG = {
  provider: 'gemini',
  model: 'gemini-2.5-flash',
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
} as const;

const GEMINI_API_KEY =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
  Constants.expoConfig?.extra?.geminiApiKey ||
  '';

const getAiGenerateUrl = () => `${AI_CONFIG.baseUrl}/${AI_CONFIG.model}:generateContent?key=${GEMINI_API_KEY}`;

const PROXY_FUNCTION_PATH = '/functions/v1/gemini-proxy';

/**
 * Yalnız proje adresi verildiyse fonksiyon yolunu ekler; tam fonksiyon adresi
 * verildiyse olduğu gibi kullanır.
 */
const normalizeProxyUrl = (value: string): string => {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return trimmed.includes('/functions/') ? trimmed : `${trimmed}${PROXY_FUNCTION_PATH}`;
};

/**
 * AI VEKİLİ (proxy)
 *
 * `EXPO_PUBLIC_` önekli her değer istemci paketine gömülür; Gemini anahtarı bu
 * yüzden fiilen ifşa oluyordu. Vekil tanımlıysa AI çağrıları sunucudan geçer ve
 * anahtar yalnız orada durur. Tanımlı DEĞİLSE eski doğrudan yol aynen çalışır,
 * yani kullanıcı fonksiyonu dağıtana kadar uygulama bozulmaz.
 * Dağıtım: docs/AI_PROXY_SETUP.md
 */
const AI_PROXY_URL = normalizeProxyUrl(
  process.env.EXPO_PUBLIC_AI_PROXY_URL ||
  Constants.expoConfig?.extra?.aiProxyUrl ||
  ''
);

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  '';

/** Vekil hazır değil mi? (fonksiyon dağıtılmamış ya da anahtarı tanımlanmamış) */
const isProxyUnavailableStatus = (status: number) => status === 404 || status === 501 || status === 503;

/** AI kullanılabilir mi? Vekil varsa istemcide anahtar olmasa da kullanılabilir. */
export const isAiConfigured = (): boolean => Boolean(AI_PROXY_URL || GEMINI_API_KEY);

const buildGenerationBody = (prompt: string) => ({
  contents: [{ parts: [{ text: prompt }] }],
  generationConfig: { temperature: 0.7 },
});

// Kategori listesini prompt'a eklemek için
const categoryListForPrompt = TASK_CATEGORIES.map(c => `"${c.id}" (${c.label})`).join(', ');
const VALID_PRIORITIES = ['low', 'medium', 'high'] as const;

export type ConvertedTask = { title: string; category: string };
export type ConvertParagraphResult = ConvertedTask[] & { usedFallback?: boolean };

const isValidPriority = (priority: unknown): priority is Task['priority'] => {
  return typeof priority === 'string' && VALID_PRIORITIES.includes(priority as typeof VALID_PRIORITIES[number]);
};

const sanitizeAiTaskUpdate = (oldTask: Task, aiUpdated: any): Task => {
  const nextTitle = typeof aiUpdated.title === 'string' && aiUpdated.title.trim().length > 0
    ? aiUpdated.title.trim()
    : oldTask.title;
  const nextPriority = isValidPriority(aiUpdated.priority)
    ? aiUpdated.priority
    : oldTask.priority || 'medium';
  const nextDone = typeof aiUpdated.done === 'boolean' ? aiUpdated.done : oldTask.done;

  if (!isValidPriority(aiUpdated.priority)) {
    console.warn('AI geçersiz priority döndürdü, güvenli varsayılan kullanılıyor:', aiUpdated.priority);
  }
  if (typeof aiUpdated.done !== 'boolean') {
    console.warn('AI geçersiz done döndürdü, mevcut durum korunuyor:', aiUpdated.done);
  }

  return {
    ...oldTask,
    title: nextTitle,
    priority: nextPriority,
    done: nextDone,
  };
};

const markFallback = (tasks: ConvertedTask[]): ConvertParagraphResult => {
  const result = tasks as ConvertParagraphResult;
  Object.defineProperty(result, 'usedFallback', {
    value: true,
    enumerable: false,
    configurable: true,
  });
  return result;
};

const splitParagraphIntoLocalTasks = (paragraph: string): ConvertParagraphResult => {
  const normalized = paragraph
    .replace(/\r/g, '\n')
    .replace(/[•·]/g, '\n')
    .replace(/^\s*[-*]\s+/gm, '')
    // Numaralı liste işaretleri BÖLMEDEN ÖNCE atılır. Aksi halde "1." içindeki
    // nokta cümle sonu sanılıp satır ikiye ayrılıyor ve "1", "Rapor yaz" gibi
    // anlamsız görevler üretiliyordu.
    .replace(/^\s*\d+[.)]\s+/gm, '')
    .trim();

  const primaryParts = normalized
    // Nokta yalnız ardından rakam GELMİYORSA ayraç sayılır; böylece "2.5 saat"
    // gibi ondalık sayılar ikiye bölünmez.
    .split(/\n+|[!?;]+|\.(?!\d)/g)
    .map(part => part.trim())
    .filter(Boolean);

  const parts = primaryParts.length <= 1
    ? normalized.split(/\s*,\s*|\s+\b(?:ve sonra|sonra|ardından)\b\s+/iu).map(part => part.trim()).filter(Boolean)
    : primaryParts;

  const tasks = parts
    .map(part => part
      .replace(/^\d+[.)]\s*/, '')
      .replace(/^[-*]\s*/, '')
      // Bölme sonrası başta kalan bağlaçlar görev başlığına yapışmasın
      .replace(/^(?:ve sonra|ve|sonra|ardından|daha sonra)\s+/iu, '')
      .replace(/\s+/g, ' ')
      .trim()
    )
    .filter(part => part.length > 0)
    .slice(0, 10)
    .map(title => ({
      title: title.substring(0, 100),
      category: 'diger',
    }));

  if (tasks.length > 0) return markFallback(tasks);

  const fallbackTitle = paragraph.replace(/\s+/g, ' ').trim().substring(0, 100);
  return markFallback(fallbackTitle ? [{ title: fallbackTitle, category: 'diger' }] : []);
};

/**
 * Yalnız geçici hatalar yeniden denenir. 400/401/403 gibi kalıcı hatalarda
 * (ör. geçersiz API anahtarı) tekrar denemek kullanıcıyı 1+2+4 saniye boşuna
 * bekletiyor ve kotayı gereksiz tüketiyordu.
 */
const isRetryableStatus = (status: number) => status === 408 || status === 429 || status >= 500;

/**
 * Otomatik tekrar deneme (retry) mekanizması ile API isteği atar.
 */
const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  retries = 3,
  backoff = 1000,
  shouldRetryStatus: (status: number) => boolean = isRetryableStatus,
): Promise<Response> => {
  try {
    const response = await fetch(url, options);
    if (!response.ok && retries > 0 && shouldRetryStatus(response.status)) {
      console.warn(`API isteği ${response.status} hatası döndürdü. ${backoff}ms sonra tekrar deneniyor... (Kalan: ${retries})`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2, shouldRetryStatus);
    }
    return response;
  } catch (err) {
    if (retries > 0) {
      console.warn(`Ağ hatası: ${err}. ${backoff}ms sonra tekrar deneniyor... (Kalan: ${retries})`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2, shouldRetryStatus);
    }
    throw err;
  }
};

/**
 * TÜM Gemini çağrılarının tek geçidi.
 *
 * Vekil tanımlıysa istek oradan gider ve istemcideki anahtar HİÇ kullanılmaz.
 * Vekil dağıtılmamış (404), anahtarı tanımlanmamış (503) ya da erişilemiyorsa
 * ve elde bir anahtar varsa eski doğrudan yola düşülür; böylece dağıtım
 * yapılmadan da uygulama çalışmaya devam eder. Kota (429) ve sunucu hataları
 * olduğu gibi aktarılır, mevcut hata akışları aynen işler.
 */
const requestGeneration = async (prompt: string): Promise<Response> => {
  const payload = buildGenerationBody(prompt);

  if (AI_PROXY_URL) {
    try {
      const response = await fetchWithRetry(
        AI_PROXY_URL,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(SUPABASE_ANON_KEY
              ? { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, apikey: SUPABASE_ANON_KEY }
              : {}),
          },
          body: JSON.stringify({ ...payload, model: AI_CONFIG.model }),
        },
        // Düşecek bir yol varsa vekilde uzun uzun beklemenin anlamı yok; yoksa
        // (anahtar istemciden kaldırıldıysa) bugünkü dayanıklılık korunur.
        GEMINI_API_KEY ? 1 : 3,
        1000,
        // "Hazır değil" kalıcı bir durum: yeniden denemek yalnız geciktirir.
        status => isRetryableStatus(status) && !isProxyUnavailableStatus(status),
      );

      if (!isProxyUnavailableStatus(response.status) || !GEMINI_API_KEY) return response;
      console.warn(`AI vekili hazır değil (${response.status}), doğrudan anahtar yoluna düşülüyor.`);
    } catch (error) {
      if (!GEMINI_API_KEY) throw error;
      console.warn('AI vekiline ulaşılamadı, doğrudan anahtar yoluna düşülüyor:', error);
    }
  }

  return fetchWithRetry(getAiGenerateUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
};

/**
 * AI ile paragrafı görev listesine çevir (kategori atamalı)
 * @param paragraph - Kullanıcının yazdığı paragraf
 * @param aboutMe - Kullanıcının "Hakkımda" bilgisi (opsiyonel)
 * @returns Task bilgileri (title + category)
 */
export const convertParagraphToTasks = async (paragraph: string, aboutMe?: string): Promise<ConvertParagraphResult> => {
  if (!isAiConfigured()) {
    console.warn('AI yapılandırılmamış (vekil ve anahtar yok), paragraf yerel olarak ayrıştırılıyor.');
    return splitParagraphIntoLocalTasks(paragraph);
  }

  // Kullanıcı bağlamı
  const userContext = aboutMe
    ? `\nKULLANICI HAKKINDA BİLGİ:\n${aboutMe}\nBu bilgiyi görevlerin kategorisini belirlerken dikkate al. Örneğin kullanıcı ders isimleri paylaştıysa, o derslerle ilgili görevleri "okul" kategorisine ata.\n`
    : '';

  // Prompt oluştur (Türkçe, açık talimatlar)
  const prompt = `
Sen bir görev planlama asistanısın. Kullanıcının yazdığı paragrafı analiz edip, madde madde görev listesine dönüştür ve her göreve uygun bir kategori ata.
${userContext}
KATEGORİLER: ${categoryListForPrompt}

KURALLAR:
1. Her görev kısa ve net olmalı (maksimum 50 karakter)
2. Sadece görev başlıklarını ver, açıklama ekleme
3. En az 2, en fazla 10 görev üret
4. Her göreve yukarıdaki kategorilerden en uygun olanını ata
5. Eğer hiçbir kategori uymuyorsa "diger" ata
6. JSON formatında döndür: [{"title": "görev", "category": "kategori_id"}, ...]
7. Sadece JSON array döndür, başka bir şey yazma

Paragraf: "${paragraph}"

Görev listesi (sadece JSON array):`;

  try {
    const response = await requestGeneration(prompt);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API Hatası:', errorData);
      throw new Error(`API isteği başarısız: ${response.status}`);
    }

    const data = await response.json();

    // Gemini response'undan metni çıkar
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      throw new Error('AI yanıt üretemedi');
    }

    // JSON'ı parse et (markdown kod bloklarını temizle)
    const cleanedText = generatedText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const tasks = JSON.parse(cleanedText);

    // Validasyon
    if (!Array.isArray(tasks) || tasks.length === 0) {
      throw new Error('Geçersiz görev listesi');
    }

    // Validasyonlu dönüşüm — hem eski format (string[]) hem yeni format desteklenir
    const validCategoryIds = TASK_CATEGORIES.map(c => c.id);
    const convertedTasks = tasks
      .map((task: any) => {
        if (typeof task === 'string') {
          // Eski format backward compat
          return { title: task.trim(), category: 'diger' };
        }
        if (task && typeof task.title === 'string') {
          const cat = validCategoryIds.includes(task.category) ? task.category : 'diger';
          return { title: task.title.trim().substring(0, 100), category: cat };
        }
        return null;
      })
      .filter((t: any): t is { title: string; category: string } => t !== null && t.title.length > 0)
      .slice(0, 10);

    // AI dizi döndürdü ama içindeki maddeler beklenen formatta değilse
    // kullanıcı boş liste ile kalmasın; yerel ayrıştırmaya düş.
    if (convertedTasks.length === 0) {
      console.warn('AI kullanılabilir görev döndürmedi, paragraf yerel olarak ayrıştırılıyor.');
      return splitParagraphIntoLocalTasks(paragraph);
    }

    return convertedTasks as ConvertParagraphResult;

  } catch (error: any) {
    console.warn('AI görev üretimi başarısız, paragraf yerel olarak ayrıştırılıyor:', error);
    return splitParagraphIntoLocalTasks(paragraph);
  }
};

/**
 * API key kontrolü
 */
export const checkApiKey = (): boolean => {
  return isAiConfigured();
};

/**
 * Kullanıcının son 7 günlük verilerini analiz edip motive edici bir özet çıkarır.
 */
export const generateWeeklySummary = async (
  userName: string,
  weeklyData: { date: string; tasks: Task[] }[]
): Promise<string> => {
  if (!isAiConfigured()) {
    throw new Error('Yapay zeka yapılandırılmamış: AI vekili yok ve API key bulunamadı.');
  }

  // Veriyi metne dök
  let dataText = '';
  let totalTasks = 0;
  let completedTasks = 0;

  weeklyData.forEach(day => {
    dataText += `Tarih: ${day.date}\n`;
    if (day.tasks.length === 0) {
      dataText += `- Görev yok\n`;
    } else {
      day.tasks.forEach(task => {
        dataText += `- [${task.done ? 'TAMAMLANDI' : 'YAPILMADI'}] ${task.title} (Öncelik: ${task.priority})\n`;
        totalTasks++;
        if (task.done) completedTasks++;
      });
    }
    dataText += '\n';
  });

  const prompt = `
Sen "DailyPlanner" uygulamasının tatlı, esprili ve motive edici yapay zeka asistanısın.
Görev analizini okuyup kullanıcının haftasını değerlendireceksin.

KULLANICI BİLGİLERİ:
İsim: ${userName || 'Kullanıcı'}
Toplam Görev: ${totalTasks}
Tamamlanan: ${completedTasks}

GÜNLÜK VERİLER:
${dataText}

KURALLAR:
1. Kullanıcıya ismiyle hitap et.
2. Fazla uzun yazma, 3-4 cümlelik kısa ve samimi bir paragraf olsun.
3. Hangi konularda (örneğin spor, iş, ders, su içme) eksik kaldığını veya hangilerinde çok iyi olduğunu fark et.
4. Robot gibi değil, yakın bir arkadaş veya yaşam koçu gibi konuş. Mutlaka emoji kullan.
5. Sadece yanıtı döndür, başka hiçbir şey yazma.`;

  try {
    const response = await requestGeneration(prompt);

    if (!response.ok) {
      throw new Error('API yanıt vermedi.');
    }

    const data = await response.json();
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!summary) throw new Error('AI yanıt üretemedi.');
    return summary;
  } catch (error) {
    console.error('AI Weekly Summary Hatası:', error);
    throw new Error('Analiz oluşturulurken bir hata meydana geldi.');
  }
};

/**
 * AI ile mevcut planı kullanıcının isteğine göre düzenler (Modify Plan)
 * @param currentTasks - Mevcut görev listesi
 * @param userPrompt - Kullanıcının değişiklik isteği (ör. "Bugün çok hastayım, önemli olmayanları sil")
 * @returns Güncellenmiş Task listesi
 */
export const modifyPlanWithAI = async (currentTasks: Task[], userPrompt: string): Promise<Task[]> => {
  if (!isAiConfigured()) {
    throw new Error('Yapay zeka yapılandırılmamış: AI vekili yok ve API key bulunamadı.');
  }

  const prompt = `
Sen bir görev planlama asistanısın. Kullanıcının MEVCUT görev listesi var ve bu listeyi kullanıcının YENİ İSTEĞİNE göre güncellemek istiyor.

MEVCUT GÖREVLER (JSON):
${JSON.stringify(currentTasks.map(t => ({ id: t.id, title: t.title, priority: t.priority, done: t.done })), null, 2)}

KULLANICININ YENİ İSTEĞİ: "${userPrompt}"

KURALLAR:
1. Kullanıcının isteğini analiz et (ör. "önemsizleri sil", "ertelenmişleri yarına at" vb. ise buna göre listeyi filtrele veya önceliklerini/başlıklarını değiştir).
2. Sonuçları GÜNCELLENMİŞ bir JSON array olarak döndür. 
3. Orijinal "id" değerlerini KORU. Sadece JSON array döndür, açıklama yapma.
4. Çıktı formatı: [{"id": "...", "title": "...", "priority": "low|medium|high", "done": boolean}, ...]
`;

  try {
    const response = await requestGeneration(prompt);

    if (!response.ok) throw new Error('API hatası');
    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!generatedText) throw new Error('AI yanıt üretemedi');

    const cleanedText = generatedText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const updatedTasksData = JSON.parse(cleanedText);
    if (!Array.isArray(updatedTasksData)) {
      throw new Error('AI geçersiz görev listesi döndürdü');
    }

    // Orijinal görevleri yeni veriyle birleştir (Kategori vb. kaybolmaması için)
    return currentTasks.map(oldTask => {
      const aiUpdated = updatedTasksData.find((t: any) => t.id === oldTask.id);
      if (aiUpdated) {
        return sanitizeAiTaskUpdate(oldTask, aiUpdated);
      }
      return null; // AI sildiyse null döner
    }).filter(t => t !== null) as Task[];

  } catch (error) {
    console.error('AI Plan Düzenleme Hatası:', error);
    throw new Error('Plan düzenlenirken bir hata oluştu');
  }
};
