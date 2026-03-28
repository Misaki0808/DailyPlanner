import { Task } from '../types';
import { TASK_CATEGORIES } from './categories';

// Proxy sunucu bağlantısı
// Production için: 'https://ornek-proxy.com/api/gemini'
const PROXY_URL = process.env.EXPO_PUBLIC_PROXY_URL || 'http://localhost:3000/api/gemini';

// Kategori listesini prompt'a eklemek için
const categoryListForPrompt = TASK_CATEGORIES.map(c => `"${c.id}" (${c.label})`).join(', ');

/**
 * Proxy üzerinden Gemini API'ye istek atan merkezi fonksiyon
 */
const fetchFromProxy = async (prompt: string, temperature: number = 0.7): Promise<string> => {
  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, temperature })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Sunucu isteği başarısız: ${response.status}`);
  }

  const data = await response.json();
  const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!generatedText) throw new Error('AI yanıt üretemedi');
  return generatedText;
};

/**
 * AI ile paragrafı görev listesine çevir (kategori atamalı)
 */
export const convertParagraphToTasks = async (paragraph: string, aboutMe?: string): Promise<{ title: string; category: string }[]> => {
  const userContext = aboutMe
    ? `\nKULLANICI HAKKINDA BİLGİ:\n${aboutMe}\nBu bilgiyi görevlerin kategorisini belirlerken dikkate al.\n`
    : '';

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
    const generatedText = await fetchFromProxy(prompt, 0.7);

    // JSON'ı parse et
    const cleanedText = generatedText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const tasks = JSON.parse(cleanedText);

    if (!Array.isArray(tasks) || tasks.length === 0) {
      throw new Error('Geçersiz görev listesi');
    }

    const validCategoryIds = TASK_CATEGORIES.map(c => c.id);
    return tasks
      .map((task: any) => {
        if (typeof task === 'string') return { title: task.trim(), category: 'diger' };
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
    if (error.message.includes('JSON')) throw new Error('AI yanıtı işlenemedi');
    if (error.message.includes('network') || error.message.includes('fetch')) throw new Error('Proxy sunucuya bağlanılamadı');
    throw new Error('AI ile iletişim kurulamadı');
  }
};

/**
 * API key kontrolü (Artık Frontend'de tutulmuyor, direkt açık kabul ediliyor)
 */
export const checkApiKey = (): boolean => true;

/**
 * Sesli girişten gelen metni AI ile düzelt
 */
export const correctVoiceTranscript = async (rawTranscript: string): Promise<string> => {
  const prompt = `
Sen bir ses tanıma düzeltme asistanısın. Aşağıdaki metin Türkçe konuşma sırasında sesli giriş ile oluşturuldu.
Ses tanıma sistemi İngilizce teknik terimleri yanlış algılamış olabilir.

ÖRNEKLERİ İNCELE:
- "Başkent Evlatlarım" → "backend developer"
- "frontand" → "frontend"
- "promp" → "prompt"
- "fremvörk" veya "freymvörk" → "framework"

KURALLAR:
1. Sadece yanlış algılanmış İngilizce teknik terimleri düzelt
2. Doğru yazılmış Türkçe kelimeleri DEĞİŞTİRME
3. SADECE düzeltilmiş metni döndür, başka bir şey yazma
4. Eğer metin zaten doğruysa aynen döndür

Ham metin: "${rawTranscript}"

Düzeltilmiş metin:`;

  try {
    const correctedText = await fetchFromProxy(prompt, 0.1);
    return correctedText.trim() || rawTranscript;
  } catch (error) {
    console.error('Ses düzeltme hatası:', error);
    return rawTranscript;
  }
};

/**
 * Sesli girdiyi tek bir görev başlığına dönüştür
 */
export const convertToSingleTask = async (rawTranscript: string): Promise<string> => {
  const prompt = `Aşağıdaki sesli girdiyi kısa ve öz tek bir görev başlığına dönüştür.

ÖRNEKLER:
- "yarın okula gitmem lazım" → "Okula git"
- "bir de backend çalışmam gerekiyor" → "Backend çalış"

KURALLAR:
1. Sadece tek bir kısa görev başlığı döndür
2. Fiili emir kipinde yaz (git, yap, çalış)
3. SADECE görev başlığını döndür, başka bir şey yazma

Sesli girdi: "${rawTranscript}"

Görev başlığı:`;

  try {
    const title = await fetchFromProxy(prompt, 0.1);
    return title.trim() || rawTranscript;
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
3. Hangi konularda eksik kaldığını veya başarılı olduğunu fark et.
4. Robot gibi değil, yakın bir arkadaş gibi konuş. Emoji kullan.
5. Sadece yanıtı döndür, başka bir şey yazma.`;

  try {
    const summary = await fetchFromProxy(prompt, 0.7);
    if (!summary) throw new Error('AI yanıt üretemedi.');
    return summary.trim();
  } catch (error) {
    console.error('AI Weekly Summary Hatası:', error);
    throw new Error('Analiz oluşturulurken bir hata meydana geldi.');
  }
};
