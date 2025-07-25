const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');

require('dotenv').config();

// Debug: Verifique se as variáveis de ambiente estão sendo carregadas corretamente
console.log("BSPAY_CLIENT_ID:", process.env.BSPAY_CLIENT_ID);
console.log("BSPAY_CLIENT_SECRET:", process.env.BSPAY_CLIENT_SECRET);

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Endpoint para gerar cobrança Pix via BSPAY
app.post('/api/pix/generate', async (req, res) => {
  const { nome, cpf, email, valor, descricao } = req.body;
  const payload = {
    client_id: process.env.BSPAY_CLIENT_ID,
    client_secret: process.env.BSPAY_CLIENT_SECRET,
    nome,
    cpf,
    valor: valor.toString(), // Ex: "30.00"
    descricao,
    urlnoty: 'https://backend-indicafacil.onrender.com/api/pix/webhook'
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