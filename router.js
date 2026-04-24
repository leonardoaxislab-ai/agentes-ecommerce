const db = require('./supabase');
const carlos = require('./agents/carlos');
const larissa = require('./agents/larissa');
const diego = require('./agents/diego');
const beatriz = require('./agents/beatriz');
const max = require('./agents/max');
const rita = require('./agents/rita');

// Mapa de agentes disponíveis
const AGENTS = { carlos, larissa, diego, beatriz, max, rita };

// Palavras-chave que disparam a troca de agente automaticamente
const ROUTING_KEYWORDS = {
  diego: [
    'pedido', 'entrega', 'rastreio', 'rastrear', 'prazo', 'envio',
    'frete', 'chegou', 'atraso', 'transportadora', 'correios', 'código de rastreio',
  ],
  beatriz: [
    'troca', 'devolução', 'devolver', 'trocar', 'defeito', 'errado',
    'tamanho errado', 'reembolso', 'arrependimento', 'cancelar pedido',
  ],
  max: [
    'promoção', 'desconto', 'cupom', 'oferta', 'novidade',
    'lançamento', 'sale', 'liquidação',
  ],
  carlos: [
    'comprar', 'quero comprar', 'preço', 'valor', 'catálogo',
    'camiseta', 'modelo', 'cor', 'estampa', 'tamanho', 'quanto custa',
  ],
  rita: [
    'satisfação', 'avaliação', 'nota', 'feedback', 'opinião',
    'fidelidade', 'pontos', 'vip',
  ],
  larissa: [
    'dúvida', 'pergunta', 'ajuda', 'informação', 'pagamento',
    'parcelamento', 'pix', 'boleto', 'cartão',
  ],
};

async function route(phone, message, senderName) {
  // Busca ou cria o cliente no banco de dados
  const customer = await db.getOrCreateCustomer(phone, senderName);

  // Busca as últimas 10 mensagens para contexto da conversa
  const history = await db.getConversationHistory(phone, 10);

  // Salva a mensagem do cliente antes de processar
  await db.saveMessage(phone, 'user', message);

  // Define o agente padrão (Carlos = vendas) ou usa o último agente ativo
  let agentName = customer.current_agent || 'carlos';

  // Verifica keywords para rotear para o agente especializado
  const lowerMessage = message.toLowerCase();
  for (const [agent, keywords] of Object.entries(ROUTING_KEYWORDS)) {
    if (keywords.some((kw) => lowerMessage.includes(kw))) {
      agentName = agent;
      break;
    }
  }

  console.log(`[Router] Agente selecionado: ${agentName}`);

  // Chama o agente selecionado
  const agent = AGENTS[agentName];
  const response = await agent.respond(message, history, customer);

  // Persiste a resposta e atualiza qual agente está cuidando deste cliente
  await db.saveMessage(phone, 'assistant', response);
  await db.updateCustomerAgent(phone, agentName);

  return response;
}

module.exports = { route };
