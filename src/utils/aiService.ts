import Constants from 'expo-constants';
import { Task } from '../types';
import { TASK_CATEGORIES } from './categories';
import { extractTimesLocal } from './timeParser';
import { correctTranscriptLocal } from './voiceParser';

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
    .trim();

  const primaryParts = normalized
    .split(/\n+|[.!?;]+/g)
    .map(part => part.trim())
    .filter(Boolean);

  const parts = primaryParts.length <= 1
    ? normalized.split(/\s*,\s*|\s+\b(?:ve sonra|sonra|ardından)\b\s+/iu).map(part => part.trim()).filter(Boolean)
    : primaryParts;

  const tasks = parts
    .map(part => part
      .replace(/^\d+[.)]\s*/, '')
      .replace(/^[-*]\s*/, '')
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
 * Otomatik tekrar deneme (retry) mekanizması ile API isteği atar.
 */
/**
 * Yalnız geçici hatalar yeniden denenir. 400/401/403 gibi kalıcı hatalarda
 * (ör. geçersiz API anahtarı) tekrar denemek kullanıcıyı 1+2+4 saniye boşuna
 * bekletiyor ve kotayı gereksiz tüketiyordu.
 */
const isRetryableStatus = (status: number) => status === 408 || status === 429 || status >= 500;

const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, backoff = 1000): Promise<Response> => {
  try {
    const response = await fetch(url, options);
    if (!response.ok && retries > 0 && isRetryableStatus(response.status)) {
      console.warn(`API isteği ${response.status} hatası döndürdü. ${backoff}ms sonra tekrar deneniyor... (Kalan: ${retries})`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    return response;
  } catch (err) {
    if (retries > 0) {
      console.warn(`Ağ hatası: ${err}. ${backoff}ms sonra tekrar deneniyor... (Kalan: ${retries})`);
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
    throw err;
  }
};

/**
 * AI ile paragrafı görev listesine çevir (kategori atamalı)
 * @param paragraph - Kullanıcının yazdığı paragraf
 * @param aboutMe - Kullanıcının "Hakkımda" bilgisi (opsiyonel)
 * @returns Task bilgileri (title + category)
 */
export const convertParagraphToTasks = async (paragraph: string, aboutMe?: string): Promise<ConvertParagraphResult> => {
  if (!GEMINI_API_KEY) {
    console.warn('AI API anahtarı yok, paragraf yerel olarak ayrıştırılıyor.');
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

  const url = getAiGenerateUrl();

  try {
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
        },
      }),
    });

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
  return !!GEMINI_API_KEY;
};

/**
 * Sesli girişten gelen metni AI ile düzelt
 * Türkçe konuşma sırasında yanlış algılanan İngilizce teknik terimleri düzeltir
 * @param rawTranscript - Ham ses tanıma çıktısı
 * @returns Düzeltilmiş metin
 */
export const correctVoiceTranscript = async (rawTranscript: string): Promise<string> => {
  return correctTranscriptLocal(rawTranscript);
};

export const correctVoiceTranscriptWithAI = async (rawTranscript: string): Promise<string> => {
  if (!GEMINI_API_KEY) {
    return correctTranscriptLocal(rawTranscript);
  }

  const prompt = `
Sen bir ses tanıma düzeltme asistanısın. Aşağıdaki metin Türkçe konuşma sırasında sesli giriş ile oluşturuldu.
Ses tanıma sistemi İngilizce teknik terimleri yanlış algılamış olabilir.

ÖRNEKLERİ İNCELE:
- "Başkent Evlatlarım" → "backend developer"
- "backent" → "backend"
- "frontand" → "frontend"
- "promp" → "prompt"
- "fremvörk" veya "freymvörk" → "framework"
- "hey ay" veya "hey ayrı" → "AI"
- "databeys" → "database"
- "dıploy" → "deploy"
- "ripozitori" → "repository"
- "ey pi ay" → "API"

KURALLAR:
1. Sadece yanlış algılanmış İngilizce teknik terimleri düzelt
2. Doğru yazılmış Türkçe kelimeleri DEĞİŞTİRME
3. Cümle yapısını ve anlamı koru
4. SADECE düzeltilmiş metni döndür, başka bir şey yazma
5. Eğer metin zaten doğruysa aynen döndür

Ham metin: "${rawTranscript}"

Düzeltilmiş metin:`;

  const url = getAiGenerateUrl();

  try {
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 }, // Düşük sıcaklık = daha deterministik
      }),
    });

    if (!response.ok) {
      console.warn('Ses düzeltme API yanıtı başarısız, ham metin korunuyor:', response.status);
      return correctTranscriptLocal(rawTranscript);
    }

    const data = await response.json();
    const correctedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!correctedText) {
      console.warn('Ses düzeltme AI boş yanıt döndürdü, ham metin korunuyor.');
      return correctTranscriptLocal(rawTranscript);
    }

    return correctTranscriptLocal(correctedText);
  } catch (error) {
    console.error('Ses düzeltme hatası:', error);
    return correctTranscriptLocal(rawTranscript);
  }
};

// Sesli girdiyi tek bir görev başlığına dönüştür
export const convertToSingleTask = async (rawTranscript: string): Promise<string> => {
  if (!GEMINI_API_KEY) return rawTranscript;

  const prompt = `Aşağıdaki sesli girdiyi kısa ve öz tek bir görev başlığına dönüştür.

ÖRNEKLER:
- "yarın okula gitmem lazım" → "Okula git"
- "bir de backend çalışmam gerekiyor" → "Backend çalış"
- "spor yapmalıyım akşam" → "Spor yap"
- "react native projesini bitir" → "React Native projesini bitir"

KURALLAR:
1. Sadece tek bir kısa görev başlığı döndür
2. Fiili emir kipinde yaz (git, yap, çalış, oku)
3. Gereksiz kelimeleri çıkar (lazım, gerekiyor, bir de, yarın)
4. İngilizce teknik terimleri koru
5. SADECE görev başlığını döndür, başka bir şey yazma

Sesli girdi: "${rawTranscript}"

Görev başlığı:`;

  const url = getAiGenerateUrl();

  try {
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 },
      }),
    });

    if (!response.ok) {
      console.warn('Tek görev dönüştürme API yanıtı başarısız, ham metin korunuyor:', response.status);
      return rawTranscript;
    }
    const data = await response.json();
    const taskTitle = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!taskTitle) {
      console.warn('Tek görev dönüştürme AI boş yanıt döndürdü, ham metin korunuyor.');
      return rawTranscript;
    }
    return taskTitle;
  } catch (error) {
    console.warn('Tek görev dönüştürme hatası, ham metin korunuyor:', error);
    return rawTranscript;
  }
};

/**
 * Kullanıcının son 7 günlük verilerini analiz edip motive edici bir özet çıkarır.
 */
export const generateWeeklySummary = async (
  userName: string,
  weeklyData: { date: string; tasks: Task[] }[]
): Promise<string> => {
  if (!GEMINI_API_KEY) {
    throw new Error('API key bulunamadı. Lütfen .env dosyasını kontrol edin.');
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

  const url = getAiGenerateUrl();

  try {
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7 },
      }),
    });

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
 * Metinden saat referanslarını çıkar (alarm için)
 * Ör: "Sabah 8'de kalkacağım, 14:30'da toplantı var" → [{hour:8, minute:0, label:"Kalk"}, {hour:14, minute:30, label:"Toplantı"}]
 */
export const extractTimesFromText = async (paragraph: string): Promise<{ hour: number; minute: number; label: string }[]> => {
  return extractTimesLocal(paragraph);
};

export const extractTimesFromTextWithAI = async (paragraph: string): Promise<{ hour: number; minute: number; label: string }[]> => {
  if (!GEMINI_API_KEY) return extractTimesLocal(paragraph);

  const prompt = `
Aşağıdaki Türkçe metinde zaman/saat referansları var mı analiz et.
Eğer varsa, her biri için saat, dakika ve kısa etiket (ne yapılacak) çıkar.

ÖRNEKLER:
"Sabah 8'de kalkacağım" → [{"hour":8,"minute":0,"label":"Kalk"}]
"14:30'da toplantı var" → [{"hour":14,"minute":30,"label":"Toplantı"}]
"Akşam 7'de spor" → [{"hour":19,"minute":0,"label":"Spor"}]
"Gece 11'de yat" → [{"hour":23,"minute":0,"label":"Yat"}]
"Öğlen yemek ye" → [{"hour":12,"minute":0,"label":"Yemek ye"}]

KURALLAR:
1. Sadece net saat belirtilmişse çıkar
2. "Sabah", "öğlen", "akşam" gibi belirsiz ifadeler saat belirtmiyorsa ÇIKARMA
3. "Sabah 8" gibi saat belirtenleri çıkar
4. Etiket kısa olsun (2-3 kelime max)
5. Sadece JSON array döndür: [{"hour":number,"minute":number,"label":"string"}, ...]
6. Hiç saat yoksa boş array döndür: []

Metin: "${paragraph}"

JSON:`;

  const url = getAiGenerateUrl();

  try {
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 },
      }),
    });

    if (!response.ok) {
      console.warn('Saat çıkarma API yanıtı başarısız, boş liste dönülüyor:', response.status);
      return extractTimesLocal(paragraph);
    }
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
      console.warn('Saat çıkarma AI boş yanıt döndürdü, boş liste dönülüyor.');
      return extractTimesLocal(paragraph);
    }

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const times = JSON.parse(cleaned);

    if (!Array.isArray(times)) {
      console.warn('Saat çıkarma AI JSON array döndürmedi, boş liste dönülüyor.');
      return extractTimesLocal(paragraph);
    }
    return times.filter(
      (t: any) => typeof t.hour === 'number' && typeof t.minute === 'number' && typeof t.label === 'string'
    );
  } catch (e) {
    console.warn('Saat çıkarma hatası, boş liste dönülüyor:', e);
    return extractTimesLocal(paragraph);
  }
};

/**
 * AI ile mevcut planı kullanıcının isteğine göre düzenler (Modify Plan)
 * @param currentTasks - Mevcut görev listesi
 * @param userPrompt - Kullanıcının değişiklik isteği (ör. "Bugün çok hastayım, önemli olmayanları sil")
 * @returns Güncellenmiş Task listesi
 */
export const modifyPlanWithAI = async (currentTasks: Task[], userPrompt: string): Promise<Task[]> => {
  if (!GEMINI_API_KEY) {
    throw new Error('API key bulunamadı.');
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

  const url = getAiGenerateUrl();
  try {
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7 },
      }),
    });

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
