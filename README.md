# 🛍️ StyleDrop — Sistema de Agentes WhatsApp

Sistema multiagente para atendimento no WhatsApp de um ecommerce de camisetas, usando **Anthropic Claude**, **Supabase** e **Evolution API**.

## 🤖 Os Agentes

| Agente | Especialidade | Palavras-chave |
|--------|--------------|----------------|
| **Carlos** | Vendas e catálogo | comprar, preço, modelo, camiseta, tamanho |
| **Larissa** | Suporte geral (SAC) | dúvida, pagamento, parcelamento, ajuda |
| **Diego** | Logística e rastreio | pedido, entrega, rastreio, frete, envio |
| **Beatriz** | Trocas e devoluções | troca, devolução, defeito, reembolso |
| **Max** | Marketing e promoções | promoção, desconto, cupom, novidade |
| **Rita** | Pós-venda e fidelidade | satisfação, pontos, feedback, vip |

## 📋 Pré-requisitos

- Node.js 18+
- Conta no [Anthropic Console](https://console.anthropic.com)
- Projeto no [Supabase](https://supabase.com)
- Servidor com [Evolution API](https://github.com/EvolutionAPI/evolution-api) configurado

## 🚀 Como Rodar

### 1. Clone e instale as dependências

```bash
cd agentes-ecommerce
npm install
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` com suas chaves:
- `ANTHROPIC_API_KEY` — no [console.anthropic.com](https://console.anthropic.com)
- `SUPABASE_URL` e `SUPABASE_ANON_KEY` — no painel do Supabase em Settings > API
- `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `INSTANCE_NAME` — no seu servidor Evolution API

### 3. Crie as tabelas no Supabase

Execute no **SQL Editor** do Supabase:

```sql
-- Tabela de clientes
create table customers (
  id uuid default gen_random_uuid() primary key,
  phone text unique not null,
  name text,
  current_agent text default 'carlos',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabela de mensagens (histórico das conversas)
create table messages (
  id uuid default gen_random_uuid() primary key,
  phone text not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);
create index on messages (phone, created_at desc);

-- Tabela de pedidos (opcional, usada pelo Diego)
create table orders (
  id text primary key,
  customer_phone text not null,
  status text not null,
  tracking_code text,
  total numeric,
  items jsonb,
  created_at timestamptz default now()
);
```

### 4. Configure o webhook na Evolution API

No painel da Evolution API, configure o webhook da instância para apontar para:

```
http://SEU_SERVIDOR:3000/webhook
```

Eventos necessários: `messages.upsert`

### 5. Inicie o servidor

```bash
# Produção
npm start

# Desenvolvimento (reinicia automaticamente)
npm run dev
```

O servidor estará disponível em `http://localhost:3000`.

## 📁 Estrutura do Projeto

```
agentes-ecommerce/
├── index.js        — Servidor Express, recebe webhooks e envia respostas
├── router.js       — Decide qual agente atende com base em keywords
├── supabase.js     — Funções do banco de dados (CRUD)
├── agents/
│   ├── carlos.js   — Agente de vendas
│   ├── larissa.js  — Agente de suporte
│   ├── diego.js    — Agente de logística
│   ├── beatriz.js  — Agente de trocas
│   ├── max.js      — Agente de marketing
│   └── rita.js     — Agente de pós-venda
├── .env.example    — Variáveis de ambiente (copiar para .env)
└── package.json
```

## ⚙️ Personalização

### Trocar o modelo Claude

Por padrão, todos os agentes usam `claude-opus-4-7`. Para usar um modelo mais rápido e barato (recomendado para produção de alto volume):

Em cada agente (`agents/*.js`), troque:
```js
model: 'claude-opus-4-7'   // mais inteligente, mais caro
// por:
model: 'claude-haiku-4-5'  // mais rápido, mais barato (~10x)
```

### Adicionar um novo agente

1. Crie `agents/novoagente.js` seguindo o padrão dos existentes
2. Importe e adicione no mapa `AGENTS` em `router.js`
3. Adicione as palavras-chave em `ROUTING_KEYWORDS` em `router.js`

### Ajustar roteamento

Edite o objeto `ROUTING_KEYWORDS` em `router.js` para adicionar/remover palavras que disparam cada agente.

## 🔒 Segurança

- Nunca comite o arquivo `.env` (já está no `.gitignore`)
- Use variáveis de ambiente em produção (Railway, Render, etc.)
- Considere adicionar validação de assinatura do webhook da Evolution API
