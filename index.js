require('dotenv').config();
const express = require('express');
const router = require('./router');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Webhook principal — a Evolution API chama esta rota a cada mensagem recebida
app.post('/webhook', async (req, res) => {
  try {
    const { event, data } = req.body;

    // Ignora eventos que não sejam mensagens recebidas
    if (event !== 'messages.upsert') {
      return res.status(200).json({ status: 'ignored' });
    }

    // Ignora mensagens enviadas pelo próprio bot (fromMe: true)
    if (data?.key?.fromMe) {
      return res.status(200).json({ status: 'own_message' });
    }

    // Extrai número de telefone (remove sufixo do WhatsApp)
    const phone = data.key.remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
    const senderName = data.pushName || 'Cliente';

    // Extrai o texto da mensagem (suporta texto simples e citações)
    const message =
      data.message?.conversation ||
      data.message?.extendedTextMessage?.text ||
      '';

    if (!message.trim()) {
      return res.status(200).json({ status: 'no_text_message' });
    }

    console.log(`[${new Date().toLocaleTimeString()}] ${senderName} (${phone}): ${message}`);

    // Router decide qual agente responde e retorna a resposta
    const response = await router.route(phone, message, senderName);

    // Envia a resposta de volta pelo WhatsApp via Evolution API
    await sendWhatsAppMessage(phone, response);

    console.log(`[${new Date().toLocaleTimeString()}] Resposta enviada para ${phone}`);
    res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('Erro no webhook:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Envia mensagem de texto via Evolution API
async function sendWhatsAppMessage(phone, text) {
  const url = `${process.env.EVOLUTION_API_URL}/message/sendText/${process.env.INSTANCE_NAME}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: process.env.EVOLUTION_API_KEY,
    },
    body: JSON.stringify({
      number: phone,
      options: { delay: 1200 }, // simula "digitando..." por 1.2s
      textMessage: { text },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Evolution API error ${response.status}: ${body}`);
  }

  return response.json();
}

// Rota de teste direto — chama um agente sem passar pelo webhook nem pelo Supabase
// Uso: POST /agente/:nome  { "mensagem": "...", "telefone": "..." }
app.post('/agente/:nome', async (req, res) => {
  try {
    const { nome } = req.params;
    const { mensagem, telefone = '0000000000' } = req.body;

    if (!mensagem) {
      return res.status(400).json({ error: 'Campo "mensagem" é obrigatório' });
    }

    const agentes = {
      carlos: require('./agents/carlos'),
      larissa: require('./agents/larissa'),
      diego: require('./agents/diego'),
      beatriz: require('./agents/beatriz'),
      max: require('./agents/max'),
      rita: require('./agents/rita'),
    };

    const agente = agentes[nome.toLowerCase()];
    if (!agente) {
      return res.status(404).json({ error: `Agente "${nome}" não encontrado. Disponíveis: ${Object.keys(agentes).join(', ')}` });
    }

    const cliente = { phone: telefone, name: 'Teste', current_agent: nome };
    const resposta = await agente.respond(mensagem, [], cliente);

    res.json({ agente: nome, resposta });
  } catch (error) {
    console.error('Erro no teste de agente:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Rota de healthcheck — útil para verificar se o servidor está no ar
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor de agentes rodando na porta ${PORT}`);
  console.log(`📡 Webhook disponível em: POST http://localhost:${PORT}/webhook`);
});
