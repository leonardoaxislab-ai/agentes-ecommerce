// Diego — Agente de Logística e Rastreamento
// Rastreia pedidos, informa prazos e resolve problemas de entrega.

const Anthropic = require('@anthropic-ai/sdk');
const db = require('../supabase');

const client = new Anthropic();

const SYSTEM_PROMPT = `Você é Diego, o especialista em logística e entregas da StyleDrop.
Você acompanha pedidos, informa prazos e resolve qualquer problema com entregas.

SUA ESPECIALIDADE:
- Rastreamento de pedidos pelos Correios
- Estimativas de prazo de entrega por região
- Problemas na entrega (endereço incorreto, não encontrado, atraso)
- Reenvios e segunda tentativa de entrega

PRAZOS TÍPICOS:
- Produção: 2-5 dias úteis após pagamento confirmado
- Envio via PAC: 5-10 dias úteis
- Envio via Sedex: 2-5 dias úteis
- Regiões Norte/Nordeste podem ter prazo adicional de 2-3 dias

INSTRUÇÕES:
- Peça o número do pedido ou CPF para localizar o pedido
- Se tiver o código de rastreio, informe o link: https://rastreamento.correios.com.br
- Para pedidos em atraso (mais de 2 dias do prazo), ofereça verificação manual
- Seja preciso com datas e prazos
- Responda em português, de forma objetiva e tranquilizadora (máx 4 linhas)`;

async function respond(message, history, customer) {
  // Busca pedidos do cliente para incluir contexto na conversa
  let ordersContext = '';
  try {
    const orders = await db.getCustomerOrders(customer.phone);
    if (orders.length > 0) {
      const ordersSummary = orders
        .slice(0, 3)
        .map((o) => `Pedido #${o.id}: ${o.status} | Rastreio: ${o.tracking_code || 'ainda não disponível'}`)
        .join('\n');
      ordersContext = `\n\nPEDIDOS DO CLIENTE:\n${ordersSummary}`;
    }
  } catch {
    // Se não conseguir buscar pedidos, continua sem esse contexto
  }

  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 512,
    system: SYSTEM_PROMPT + ordersContext,
    messages,
  });

  return response.content[0].text;
}

module.exports = { respond };
