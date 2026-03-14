import Constants from 'expo-constants';

// .env'den API key'i al (EXPO_PUBLIC_ prefix otomatik çalışır)
const GEMINI_API_KEY =
  process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
  Constants.expoConfig?.extra?.geminiApiKey ||
  '';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/**
 * AI ile paragrafı görev listesine çevir
 * @param paragraph - Kullanıcının yazdığı paragraf
 * @returns Task listesi veya hata
 */
export const convertParagraphToTasks = async (paragraph: string): Promise<string[]> => {
  // API key kontrolü
  if (!GEMINI_API_KEY) {
    throw new Error('API key bulunamadı. Lütfen .env dosyasını kontrol edin.');
  }

  // Prompt oluştur (Türkçe, açık talimatlar)
  const prompt = `
Sen bir görev planlama asistanısın. Kullanıcının yazdığı paragrafı analiz edip, madde madde görev listesine dönüştür.

KURALLAR:
1. Her görev kısa ve net olmalı (maksimum 50 karakter)
2. Sadece görev başlıklarını ver, açıklama ekleme
3. En az 2, en fazla 10 görev üret
4. JSON formatında döndür: ["görev 1", "görev 2", ...]
5. Sadece JSON array döndür, başka bir şey yazma

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

    // Görevleri temizle ve limitele
    return tasks
      .filter((task: any) => typeof task === 'string' && task.trim().length > 0)
      .map((task: string) => task.trim().substring(0, 100))
      .slice(0, 10); // Max 10 görev

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
