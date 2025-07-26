# Configuração do Webhook BSPay (Com Autenticação de Usuário)

## 🎯 **Objetivo**
Configurar o webhook do BSPay para adicionar créditos automaticamente após pagamento confirmado.

## 📋 **Passos para Configurar**

### 1. **Deploy da Edge Function**
```bash
# Deploy da função webhook
npx supabase functions deploy bspay-webhook
```

### 2. **Opções de Autenticação**

A função aceita **duas formas de autenticação**:

#### Opção A: Usuário Real do Supabase
- Use o token de autenticação de um usuário logado
- Mais seguro e rastreável
- Permite identificar quem processou o webhook

#### Opção B: Chave Anônima
- Use a chave anônima do projeto
- Mais simples para webhooks externos
- Funciona sem usuário logado

### 3. **Obter Credenciais**

#### Para Usuário Real:
1. Faça login na aplicação
2. Abra o Console do navegador (F12)
3. Execute: `localStorage.getItem('sb-nsuoxowufivosxcchgqx-auth-token')`
4. Copie o token retornado

#### Para Chave Anônima:
- Vá para Supabase Dashboard > Settings > API
- Copie a "anon public" key

### 4. **Configurar Webhook no BSPay**
No painel do BSPay:
- Vá para Configurações > Webhooks
- URL do webhook: `https://nsuoxowufivosxcchgqx.supabase.co/functions/v1/bspay-webhook`
- Método: POST
- **Headers:**
  - `Authorization: Bearer seu_token_aqui`
  - `Content-Type: application/json`
- Eventos: `payment.confirmed` ou `payment.approved`

### 5. **Estrutura do Webhook**
A função aceita diferentes formatos de webhook:

#### Formato 1 (Esperado):
```json
{
  "event_type": "payment.confirmed",
  "data": {
    "transaction_id": "txn_123456",
    "product_id": "BSZDG3NDM3Y2",
    "customer_email": "usuario@exemplo.com",
    "amount": 25.00,
    "status": "paid",
    "paid_at": "2024-01-01T12:00:00Z"
  }
}
```

#### Formato 2 (Alternativo):
```json
{
  "status": "paid",
  "transaction_id": "txn_123456",
  "product_id": "BSZDG3NDM3Y2",
  "customer_email": "usuario@exemplo.com",
  "amount": 25.00,
  "paid_at": "2024-01-01T12:00:00Z"
}
```

#### Formato 3 (Genérico):
```json
{
  "status": "approved",
  "id": "txn_123456",
  "email": "usuario@exemplo.com",
  "amount": 25.00
}
```

### 6. **Mapeamento de Produtos**
- `BSZDG3NDM3Y2` → 25 créditos + 5 bônus (R$ 25)
- `BSOGNKZJJKMJ` → 50 créditos + 10 bônus (R$ 50)
- `BSMDQWZGNIYJ` → 100 créditos + 25 bônus (R$ 100)
- `BSMZNJMGUWMM` → 30 créditos (Taxa de ativação)

**Se não tiver product_id, a função identifica pelo valor:**
- R$ 25 → 25 créditos + 5 bônus
- R$ 50 → 50 créditos + 10 bônus
- R$ 100 → 100 créditos + 25 bônus
- R$ 30 → 30 créditos

## 🔧 **Teste do Webhook**

### Teste com Usuário Real
```bash
curl -X POST https://nsuoxowufivosxcchgqx.supabase.co/functions/v1/bspay-webhook \
  -H "Authorization: Bearer seu_token_de_usuario_aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "paid",
    "transaction_id": "test_123",
    "customer_email": "teste@exemplo.com",
    "amount": 25.00
  }'
```

### Teste com Chave Anônima
```bash
curl -X POST https://nsuoxowufivosxcchgqx.supabase.co/functions/v1/bspay-webhook \
  -H "Authorization: Bearer sua_chave_anonima_aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "paid",
    "transaction_id": "test_456",
    "product_id": "BSZDG3NDM3Y2",
    "customer_email": "teste@exemplo.com",
    "amount": 25.00
  }'
```

## 📊 **Monitoramento**

### Logs da Edge Function
- Acesse o Supabase Dashboard
- Vá para Edge Functions > bspay-webhook
- Verifique os logs para monitorar os webhooks

### Verificação de Créditos
- Após um pagamento, verifique se os créditos foram adicionados
- Consulte a tabela `profiles` para ver o campo `credits`
- Verifique a tabela `transactions` para ver o histórico
- Campo `processed_by` mostra quem processou o webhook

## 🔒 **Segurança**

1. **Usuário Real**: Mais seguro, rastreável e controlado
2. **Chave Anônima**: Simples, mas menos rastreável
3. **Validação**: A função valida dados antes de processar
4. **Duplicação**: Evita processar o mesmo pagamento duas vezes

## ⚠️ **Importante**

1. **Teste**: Sempre teste com valores pequenos primeiro
2. **Backup**: Mantenha backup dos dados antes de testar
3. **Monitoramento**: Monitore os logs regularmente
4. **Token**: Tokens de usuário expiram, renove quando necessário

## 🚀 **Resultado Esperado**

Após configuração:
- ✅ Pagamentos confirmados adicionam créditos automaticamente
- ✅ Transações são registradas no histórico
- ✅ Usuários recebem créditos + bônus
- ✅ Sistema funciona 24/7 sem intervenção manual
- ✅ Evita processamento duplicado de pagamentos
- ✅ Rastreabilidade de quem processou cada webhook

## 🔍 **Debug**

Se algo não funcionar:
1. Verifique os logs da Edge Function
2. Confirme se o email do usuário está correto
3. Verifique se o valor/amount está correto
4. Teste com diferentes formatos de webhook
5. Confirme se o token de autorização está válido
6. Verifique se o token não expirou (usuário real) 