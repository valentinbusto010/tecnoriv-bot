const express = require('express');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(express.json());

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('Webhook verificado correctamente');
                res.status(200).send(challenge);
                  } else {
                      res.sendStatus(403);
                        }
                        });

                        app.post('/webhook', async (req, res) => {
                          try {
                              const body = req.body;
                                  if (body.object !== 'whatsapp_business_account') return res.sendStatus(404);
                                      const entry = body.entry?.[0];
                                          const change = entry?.changes?.[0];
                                              const message = change?.value?.messages?.[0];
                                                  if (!message || message.type !== 'text') return res.sendStatus(200);
                                                      const from = message.from;
                                                          const text = message.text.body.toLowerCase().trim();
                                                              console.log(`Mensaje recibido de ${from}: ${text}`);
                                                                  const { data: faqs } = await supabase.from('faqs').select('*');
                                                                      let respuesta = null;
                                                                          if (faqs) {
                                                                                for (const faq of faqs) {
                                                                                        const keywords = faq.keywords.toLowerCase().split(',').map(k => k.trim());
                                                                                                const match = keywords.some(keyword => text.includes(keyword));
                                                                                                        if (match) { respuesta = faq.respuesta; break; }
                                                                                                              }
                                                                                                                  }
                                                                                                                      if (!respuesta) {
                                                                                                                            const claudeRes = await axios.post(
                                                                                                                                    'https://api.anthropic.com/v1/messages',
                                                                                                                                            {
                                                                                                                                                      model: 'claude-3-haiku-20240307',
                                                                                                                                                                max_tokens: 300,
                                                                                                                                                                          system: 'Sos el asistente virtual de TecnoRiv, una tienda de tecnologia. Responde de forma amigable, breve y en espanol rioplatense. Si no sabes algo, deci que vas a consultar con el equipo.',
                                                                                                                                                                                    messages: [{ role: 'user', content: text }]
                                                                                                                                                                                            },
                                                                                                                                                                                                    {
                                                                                                                                                                                                              headers: {
                                                                                                                                                                                                                          'x-api-key': CLAUDE_API_KEY,
                                                                                                                                                                                                                                      'anthropic-version': '2023-06-01',
                                                                                                                                                                                                                                                  'Content-Type': 'application/json'
                                                                                                                                                                                                                                                            }
                                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                                          );
                                                                                                                                                                                                                                                                                respuesta = claudeRes.data.content[0].text;
                                                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                                                        await axios.post(
                                                                                                                                                                                                                                                                                              `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
                                                                                                                                                                                                                                                                                                    {
                                                                                                                                                                                                                                                                                                            messaging_product: 'whatsapp',
                                                                                                                                                                                                                                                                                                                    to: from,
                                                                                                                                                                                                                                                                                                                            type: 'text',
                                                                                                                                                                                                                                                                                                                                    text: { body: respuesta }
                                                                                                                                                                                                                                                                                                                                          },
                                                                                                                                                                                                                                                                                                                                                {
                                                                                                                                                                                                                                                                                                                                                        headers: {
                                                                                                                                                                                                                                                                                                                                                                  Authorization: `Bearer ${WHATSAPP_TOKEN}`,
                                                                                                                                                                                                                                                                                                                                                                            'Content-Type': 'application/json'
                                                                                                                                                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                                                                                                                                                          }
                                                                                                                                                                                                                                                                                                                                                                                              );
                                                                                                                                                                                                                                                                                                                                                                                                  console.log(`Respuesta enviada a ${from}`);
                                                                                                                                                                                                                                                                                                                                                                                                      res.sendStatus(200);
                                                                                                                                                                                                                                                                                                                                                                                                        } catch (error) {
                                                                                                                                                                                                                                                                                                                                                                                                            console.error('Error:', error.response?.data || error.message);
                                                                                                                                                                                                                                                                                                                                                                                                                res.sendStatus(500);
                                                                                                                                                                                                                                                                                                                                                                                                                  }
                                                                                                                                                                                                                                                                                                                                                                                                                  });
                                                                                                                                                                                                                                                                                                                                                                                                                  
                                                                                                                                                                                                                                                                                                                                                                                                                  app.get('/', (req, res) => {
                                                                                                                                                                                                                                                                                                                                                                                                                    res.send('TecnoRiv Bot activo!');
                                                                                                                                                                                                                                                                                                                                                                                                                    });
                                                                                                                                                                                                                                                                                                                                                                                                                    
                                                                                                                                                                                                                                                                                                                                                                                                                    const PORT = process.env.PORT || 3000;
                                                                                                                                                                                                                                                                                                                                                                                                                    app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
