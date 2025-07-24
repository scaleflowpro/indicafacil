const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Variáveis de ambiente
const {
  BSPAY_CLIENT_ID,
  BSPAY_CLIENT_SECRET,
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE
} = process.env;

// Verifica se variáveis obrigatórias estão presentes
if (!BSPAY_CLIENT_ID || !BSPAY_CLIENT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  throw new Error('❌ Variáveis de ambiente não configuradas corretamente.');
}

// Inicializa Supabase com Service Role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

// Endpoint para gerar cobrança Pix
app.post('/api/pix/generate', async (req, res) => {
  const { nome, cpf, valor, descricao, email } = req.body;

  try {
    const response = await axios.post(
      'https://bspaybr.com/v3/pix/qrcode',
      new URLSearchParams({
        client_id: BSPAY_CLIENT_ID,
        client_secret: BSPAY_CLIENT_SECRET,
        nome,
        cpf,
        valor: valor.toString(),
        descricao,
        urlnoty: 'https://seudominio.com/api/pix/webhook', // 🔁 Substitua pelo domínio real
        email // incluído como metadado (se o BSPay permitir)
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    res.json(response.data);
  } catch (err) {
    console.error('❌ Erro ao gerar cobrança Pix:', err.response?.data || err.message);
    res.status(500).json({ error: 'Erro ao gerar Pix' });
  }
});

// Webhook de confirmação de pagamento
app.post('/api/pix/webhook', async (req, res) => {
  const data = req.body;
  console.log('📩 Webhook recebido da BSPAY:', data);

  if (data.status === 'COMPLETED') {
    const email = data?.metadata?.email;

    if (!email) {
      console.warn('⚠️ Webhook recebido sem e-mail no metadata.');
      return res.status(400).send('Email ausente');
    }

    const { error } = await supabase
      .from('usuarios')
      .update({ pagamento_ativo: true })
      .eq('email', email);

    if (error) {
      console.error('❌ Erro ao atualizar status de pagamento:', error);
      return res.status(500).send('Erro ao atualizar usuário');
    }

    console.log(`✅ Pagamento confirmado e ativado para: ${email}`);
  }

  res.status(200).send('OK');
});

// Start do servidor
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Backend rodando em http://localhost:${PORT}`);
});