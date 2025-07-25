const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE);

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Checkout BSPay
app.post('/api/pix/checkout', async (req, res) => {
  const { nome, cpf, email, valor, descricao, userId } = req.body;
  const external_id = `${userId || 'anon'}-${Date.now()}`;
  const payload = {
    amount: valor, // valor em reais, ex: 15
    external_id,
    payerQuestion: descricao || '',
    payer: {
      name: nome,
      document: cpf,
      email: email
    },
    postbackUrl: 'https://backend-indicafacil.onrender.com/api/pix/webhook'
  };
  try {
    const response = await axios.post(
      'https://api.bspay.co/v2/checkout',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${process.env.BSPAY_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    // Retorna a payment_url para o frontend
    res.json({ payment_url: response.data.payment_url });
  } catch (err) {
    console.error('Erro BSPAY (checkout):', err.response?.data || err.message);
    res.status(500).send(err.response?.data || 'Erro ao criar checkout Pix');
  }
});

// Webhook BSPay
app.post('/api/pix/webhook', async (req, res) => {
  const data = req.body;
  console.log('Webhook BSPAY recebido:', data);
  if ((data.status === 'CONFIRMED' || data.status === 'COMPLETED') && data.payer && data.payer.email) {
    const email = data.payer.email;
    // Busca saldo atual
    const { data: usuario, error: fetchError } = await supabase
      .from('usuarios')
      .select('saldo')
      .eq('email', email)
      .single();
    if (fetchError) {
      console.error('Erro ao buscar usuário:', fetchError);
      return res.status(500).send('Erro ao buscar usuário');
    }
    const saldoAtual = usuario?.saldo || 0;
    const novoSaldo = saldoAtual + 30;
    // Atualiza saldo do usuário
    const { error } = await supabase
      .from('usuarios')
      .update({ saldo: novoSaldo })
      .eq('email', email);
    if (error) {
      console.error('Erro ao atualizar saldo do usuário:', error);
      return res.status(500).send('Erro ao atualizar usuário');
    }
    console.log(`Pagamento confirmado e saldo atualizado para email: ${email}`);
  }
  res.status(200).send('OK');
});

// Endpoint para gerar cobrança Pix via BSPAY
app.post('/api/pix/generate', async (req, res) => {
  const { nome, cpf, email, valor, descricao, userId } = req.body;
  const external_id = `${userId || 'anon'}-${Date.now()}`;
  const payload = {
    client_id: process.env.BSPAY_CLIENT_ID,
    client_secret: process.env.BSPAY_CLIENT_SECRET,
    nome,
    cpf,
    valor: valor.toString(), // Ex: "30.00"
    descricao,
    urlnoty: 'https://backend-indicafacil.onrender.com/api/pix/webhook',
    external_id
  };

  try {
    const response = await axios.post(
      'https://api.bspay.co/v2/pix/qrcode',
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(response.data);
  } catch (err) {
    console.error('Erro BSPAY:', err.response?.data || err.message);
    res.status(500).send(err.response?.data || 'Erro ao criar Pix');
  }
});

// Endpoint para consultar status da transação Pix via BSPAY
app.post('/api/pix/status', async (req, res) => {
  const { pix_id } = req.body; // ou transactionId, conforme seu frontend

  try {
    const response = await axios.post(
      'https://api.bspay.co/v2/consult-transaction',
      { pix_id },
      {
        headers: {
          'Authorization': `Bearer ${process.env.BSPAY_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(response.data);
  } catch (err) {
    console.error('Erro BSPAY (consulta):', err.response?.data || err.message);
    res.status(500).send(err.response?.data || 'Erro ao consultar Pix');
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Servidor BSPAY rodando na porta ${port}`));