const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const { GHOSTPAY_SECRETKEY } = process.env;

app.post('/api/pix/generate', async (req, res) => {
  const { nome, cpf, valor, descricao } = req.body;
  try {
    const response = await axios.post(
      'https://bspaybr.com/v3/pix/qrcode', // ou o endpoint correto da doc
      {
        client_id: process.env.BSPAY_CLIENT_ID,
        client_secret: process.env.BSPAY_CLIENT_SECRET,
        nome,
        cpf,
        valor: valor.toString(), // geralmente em string
        descricao,
        urlnoty: 'https://seudominio.com/api/pix/webhook'
      },
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

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Servidor GhostsPay rodando na porta ${port}`));