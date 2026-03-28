require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error("HATA: GEMINI_API_KEY .env dosyasında bulunamadı!");
}

app.post('/api/gemini', async (req, res) => {
  try {
    const { prompt, temperature = 0.7 } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt gereklidir' });
    }

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Sunucuda API Key yapılandırılmamış' });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          temperature
        }
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return res.status(response.status).json(data);
    }
    
    res.json(data);
  } catch (error) {
    console.error('Proxy Error:', error);
    res.status(500).json({ error: 'Sunucu içi hata oluştu' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend API Proxy sunucusu http://0.0.0.0:${PORT} portunda çalışıyor...`);
});
