const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Variáveis de ambiente
const { BSPAY_TOKEN, SUPABASE_URL, SUPABASE_SERVICE_ROLE } = process.env;

// Instância do Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

// Endpoint para gerar Pix
app.post('/api/pix/generate', async (req, res) => {
  const { nome, cpf, email, valor, descricao } = req.body;
  const external_id = Date.now().toString();

  const payload = {
    amount: valor,
    external_id,
    payerQuestion: descricao || "",
    payer: {
      name: nome,
      document: cpf,
      email
    },
    postbackUrl: "https://indicafacil.onrender.com/api/pix/webhook"
  };

  try {
    const response = await axios.post(
      'https://api.bspay.co/v2/pix/qrcode',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${BSPAY_TOKEN}`,
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

// Endpoint para consultar status do Pix
app.post('/api/pix/status', async (req, res) => {
  const { pix_id } = req.body;

  try {
    const response = await axios.post(
      'https://api.bspay.co/v2/consult-transaction',
      { pix_id },
      {
        headers: {
          'Authorization': `Bearer ${BSPAY_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(response.data);
  } catch (err) {
    console.error('Erro consulta BSPAY:', err.response?.data || err.message);
    res.status(500).send(err.response?.data || 'Erro ao consultar Pix');
  }
});

// Webhook chamado pela BSPAY após pagamento
app.post('/api/pix/webhook', async (req, res) => {
  const data = req.body;
  console.log('Webhook BSPAY recebido:', data);

  if ((data.status === 'CONFIRMED' || data.status === 'COMPLETED') && data.payer?.email) {
    const email = data.payer.email;

    // Buscar créditos atuais do usuário
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('credits')
      .eq('email', email)
      .single();

    if (fetchError) {
      console.error('Erro ao buscar perfil:', fetchError);
      return res.status(500).send('Erro ao buscar perfil');
    }

    const saldoAtual = profile?.credits || 0;
    const novoSaldo = saldoAtual + 30;

    // Atualizar créditos
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits: novoSaldo })
      .eq('email', email);

    if (updateError) {
      console.error('Erro ao atualizar créditos:', updateError);
      return res.status(500).send('Erro ao atualizar credits');
    }

    console.log(`✅ Pagamento confirmado. Novo crédito de ${novoSaldo} para: ${email}`);
  }

  res.status(200).send('OK');
});

// Iniciar servidor
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`🚀 Backend BSPAY rodando na porta ${port}`));