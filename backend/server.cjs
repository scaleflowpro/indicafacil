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
    
    try {
      // Buscar usuário na tabela profiles pelo email
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) {
        console.error('Erro ao buscar usuários:', authError);
        return res.status(500).send('Erro ao buscar usuários');
      }
      
      const user = authUsers.users.find(u => u.email === email);
      if (!user) {
        console.error('Usuário não encontrado para email:', email);
        return res.status(404).send('Usuário não encontrado');
      }
      
      // Buscar perfil do usuário
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('credits')
        .eq('id', user.id)
        .single();
      
      if (profileError) {
        console.error('Erro ao buscar perfil:', profileError);
        return res.status(500).send('Erro ao buscar perfil');
      }
      
      const creditsAtuais = profile?.credits || 0;
      const novosCredits = creditsAtuais + 30; // Adiciona 30 créditos
      
      // Atualiza créditos do usuário na tabela profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ credits: novosCredits })
        .eq('id', user.id);
      
      if (updateError) {
        console.error('Erro ao atualizar créditos do usuário:', updateError);
        return res.status(500).send('Erro ao atualizar usuário');
      }
      
      console.log(`Pagamento confirmado e créditos atualizados para email: ${email} (${creditsAtuais} -> ${novosCredits})`);
    } catch (error) {
      console.error('Erro no webhook:', error);
      return res.status(500).send('Erro interno do servidor');
    }
  }
  
  res.status(200).send('OK');
});

// Endpoint para gerar cobrança Pix via BSPAY
app.post('/api/pix/generate', async (req, res) => {
  const { nome, cpf, email, valor, descricao, userId } = req.body;
  const external_id = `${userId || 'anon'}-${Date.now()}`;
  const payload = {
    amount: valor,
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
      'https://api.bspay.co/v2/pix/qrcode',
      payload,
      {
        headers: {
          'Authorization': `Bearer ${process.env.BSPAY_TOKEN}`,
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