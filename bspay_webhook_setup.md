# Configuração do Webhook BSPay (Com Header de Autorização)

## 🎯 **Objetivo**
Configurar o webhook do BSPay para adicionar créditos automaticamente após pagamento confirmado.

## 📋 **Passos para Configurar**

### 1. **Deploy da Edge Function**
```bash
# Deploy da função webhook
npx supabase functions deploy bspay-webhook
```

### 2. **Obter a Chave Anônima**
No Supabase Dashboard:
- Vá para Settings > API
- Copie a "anon public" key

### 3. **Configurar Webhook no BSPay**
No painel do BSPay:
- Vá para Configurações > Webhooks
- URL do webhook: `https://seu-projeto.supabase.co/functions/v1/bspay-webhook`
- Método: POST
- **Headers:**
  - `Authorization: Bearer sua_chave_anonima_aqui`
  - `Content-Type: application/json`
- Eventos: `payment.confirmed` ou `payment.approved`

### 4. **Estrutura do Webhook**
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

### 5. **Mapeamento de Produtos**
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

### Teste Manual (Com Autenticação)
```bash
curl -X POST https://nsuoxowufivosxcchgqx.supabase.co/functions/v1/bspay-webhook \
  -H "Authorization: Bearer sua_chave_anonima_aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "paid",
    "transaction_id": "test_123",
    "customer_email": "teste@exemplo.com",
    "amount": 25.00
  }'
```

### Teste com Product ID
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

## 🔒 **Segurança**

1. **Use a chave anônima**: É segura para uso público
2. **Monitore os logs**: Verifique se não há tentativas de abuso
3. **Validação**: A função valida dados antes de processar

## ⚠️ **Importante**

1. **Teste**: Sempre teste com valores pequenos primeiro
2. **Backup**: Mantenha backup dos dados antes de testar
3. **Monitoramento**: Monitore os logs regularmente
4. **Duplicação**: A função evita processar o mesmo pagamento duas vezes

## 🚀 **Resultado Esperado**

Após configuração:
- ✅ Pagamentos confirmados adicionam créditos automaticamente
- ✅ Transações são registradas no histórico
- ✅ Usuários recebem créditos + bônus
- ✅ Sistema funciona 24/7 sem intervenção manual
- ✅ Evita processamento duplicado de pagamentos

## 🔍 **Debug**

Se algo não funcionar:
1. Verifique os logs da Edge Function
2. Confirme se o email do usuário está correto
3. Verifique se o valor/amount está correto
4. Teste com diferentes formatos de webhook
5. Confirme se o header de autorização está correto 