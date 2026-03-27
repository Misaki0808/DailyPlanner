import Constants from 'expo-constants';
import { Task } from '../types';
import { TASK_CATEGORIES } from './categories';

// .env'den API key'i al (EXPO_PUBLIC_ prefix otomatik çalışır)
const GEMINI_API_KEY =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
  Constants.expoConfig?.extra?.geminiApiKey ||
  '';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// Kategori listesini prompt'a eklemek için
const categoryListForPrompt = TASK_CATEGORIES.map(c => `"${c.id}" (${c.label})`).join(', ');

/**
 * AI ile paragrafı görev listesine çevir (kategori atamalı)
 * @param paragraph - Kullanıcının yazdığı paragraf
 * @returns Task bilgileri (title + category)
 */
export const convertParagraphToTasks = async (paragraph: string): Promise<{ title: string; category: string }[]> => {
  // API key kontrolü
  if (!GEMINI_API_KEY) {
    throw new Error('API key bulunamadı. Lütfen .env dosyasını kontrol edin.');
  }

  // Prompt oluştur (Türkçe, açık talimatlar)
  const prompt = `
Sen bir görev planlama asistanısın. Kullanıcının yazdığı paragrafı analiz edip, madde madde görev listesine dönüştür ve her göreve uygun bir kategori ata.

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

  const url = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(url, {
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
    return tasks
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

  } catch (error: any) {
    console.error('AI Servis Hatası:', error);

    // Kullanıcı dostu hata mesajları
    if (error.message.includes('API key')) {
      throw new Error('API anahtarı geçersiz');
    } else if (error.message.includes('JSON')) {
      throw new Error('AI yanıtı işlenemedi');
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      throw new Error('İnternet bağlantısı hatası');
    } else {
      throw new Error('AI ile iletişim kurulamadı');
    }
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
  if (!GEMINI_API_KEY) {
    return rawTranscript; // API key yoksa ham metni döndür
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

  const url = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 }, // Düşük sıcaklık = daha deterministik
      }),
    });

    if (!response.ok) {
      return rawTranscript; // Hata durumunda ham metni döndür
    }

    const data = await response.json();
    const correctedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    return correctedText || rawTranscript;
  } catch (error) {
    console.error('Ses düzeltme hatası:', error);
    return rawTranscript;
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

  const url = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 },
      }),
    });

    if (!response.ok) return rawTranscript;
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || rawTranscript;
  } catch {
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

  const url = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(url, {
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
