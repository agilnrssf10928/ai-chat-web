const express = require('express');
const cors = require('cors');
require('dotenv').config();
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message diperlukan' });
    }

    console.log('GROQ_API_KEY tersedia:', !!GROQ_API_KEY);
    console.log('Kirim ke Groq:', { model: 'llama-3.3-70b-versatile', message });

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Kamu adalah AI assistant yang friendly dan helpful. Gaya bicara kamu santai, natural, pakai emoji, dan respond seperti teman sendiri. Gunakan bahasa Indonesia yang casual. Ketika user minta code/script, SELALU kirim FULL CODE yang ready-to-use, jangan potongan. Format code pake \`\`\`javascript atau \`\`\`python atau bahasa yg sesuai. Semakin panjang jawaban semakin bagus, karena user suka detail penjelasan.`
          },
          { role: 'user', content: message }
        ],
        max_tokens: 2048
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const reply = response.data.choices[0].message.content;
    res.json({ reply });

  } catch (error) {
    console.error('❌ Error dari Groq API:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    res.status(500).json({ error: 'AI error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server listening on 0.0.0.0:${PORT}`);
  console.log(`📍 Akses dari: http://103.147.83.248:${PORT}`);
  console.log(`🔑 Using Groq API (free tier)`);
});