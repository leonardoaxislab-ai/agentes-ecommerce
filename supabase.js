const { createClient } = require('@supabase/supabase-js');

// Cliente Supabase — inicializado uma única vez e reutilizado
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Busca o cliente pelo telefone. Se não existir, cria um novo registro.
async function getOrCreateCustomer(phone, name) {
  const { data, error } = await supabase
    .from('customers')
    .upsert(
      { phone, name, updated_at: new Date().toISOString() },
      { onConflict: 'phone', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) throw new Error(`getOrCreateCustomer: ${error.message}`);
  return data;
}

// Retorna as últimas N mensagens da conversa (em ordem cronológica)
async function getConversationHistory(phone, limit = 10) {
  const { data, error } = await supabase
    .from('messages')
    .select('role, content, created_at')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getConversationHistory: ${error.message}`);

  // Reverte para ordem cronológica (mais antigas primeiro)
  return (data || []).reverse();
}

// Salva uma mensagem (role: 'user' ou 'assistant') no histórico
async function saveMessage(phone, role, content) {
  const { error } = await supabase
    .from('messages')
    .insert({ phone, role, content });

  if (error) throw new Error(`saveMessage: ${error.message}`);
}

// Atualiza qual agente está atendendo este cliente no momento
async function updateCustomerAgent(phone, agentName) {
  const { error } = await supabase
    .from('customers')
    .update({ current_agent: agentName, updated_at: new Date().toISOString() })
    .eq('phone', phone);

  if (error) throw new Error(`updateCustomerAgent: ${error.message}`);
}

// Busca os pedidos do cliente (usado pelos agentes Diego e Beatriz)
async function getCustomerOrders(phone) {
  const { data, error } = await supabase
    .from('orders')
    .select('id, status, tracking_code, total, created_at, items')
    .eq('customer_phone', phone)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) throw new Error(`getCustomerOrders: ${error.message}`);
  return data || [];
}

module.exports = {
  getOrCreateCustomer,
  getConversationHistory,
  saveMessage,
  updateCustomerAgent,
  getCustomerOrders,
};
