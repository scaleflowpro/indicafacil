# Configuração do Webhook BSPay (Sem Chave Secreta)

## 🎯 **Objetivo**
Configurar o webhook do BSPay para adicionar créditos automaticamente após pagamento confirmado, **sem necessidade de chave secreta**.

## 📋 **Passos para Configurar**

### 1. **Deploy da Edge Function**
```bash
# Deploy da função webhook
npx supabase functions deploy bspay-webhook
```

### 2. **Configurar Webhook no BSPay**
No painel do BSPay:
- Vá para Configurações > Webhooks
- URL do webhook: `https://seu-projeto.supabase.co/functions/v1/bspay-webhook`
- Método: POST
- **Headers: (deixe vazio por enquanto)**
- Eventos: `payment.confirmed` ou `payment.approved`

### 3. **Estrutura do Webhook**
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

### 4. **Mapeamento de Produtos**
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

### Teste Manual (Sem Autenticação)
```bash
curl -X POST https://seu-projeto.supabase.co/functions/v1/bspay-webhook \
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
curl -X POST https://seu-projeto.supabase.co/functions/v1/bspay-webhook \
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

## 🔒 **Segurança (Opcional)**

Quando tiver a chave secreta do BSPay:

1. **Adicione a variável de ambiente**:
   - No Supabase Dashboard: Settings > Environment Variables
   - Adicione: `BSPAY_WEBHOOK_SECRET=sua_chave_secreta_aqui`

2. **Configure o header no BSPay**:
   - Header: `Authorization: Bearer sua_chave_secreta_aqui`

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