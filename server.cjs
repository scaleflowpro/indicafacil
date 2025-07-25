const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post('/api/pix/generate', async (req, res) => {
  const { nome, cpf, email, valor, descricao } = req.body;

  // Gera um ID único para a transação
  const external_id = Date.now().toString();

  const payload = {
    amount: valor, // valor em reais, ex: 15
    external_id: external_id,
    payerQuestion: descricao || "",
    payer: {
      name: nome,
      document: cpf,
      email: email
    },
    postbackUrl: "https://backend-indicafacil.onrender.com/api/pix/webhook"
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