const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Variável de ambiente GhostsPay
const { GHOSTPAY_SECRETKEY } = process.env;

if (!GHOSTPAY_SECRETKEY) {
  throw new Error('❌ Variável GHOSTPAY_SECRETKEY não configurada.');
}

// Endpoint para gerar cobrança Pix via GhostsPay
app.post('/api/pix/generate', async (req, res) => {
  const { nome, cpf, valor, descricao } = req.body;
  try {
    const response = await axios.post(
      'https://api.ghostspaysv1.com/pix/charge', // CONFIRME O ENDPOINT NA DOC
      {
        name: nome,
        cpf: cpf,
        value: valor,
        description: descricao
        // outros campos conforme a doc
      },
      {
        headers: {
          'Authorization': `Bearer ${GHOSTPAY_SECRETKEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    res.json(response.data);
  } catch (err) {
    console.error('Erro GhostsPay:', err.response?.data || err.message, err.stack);
    res.status(500).send(err.response?.data || err.message || 'Erro ao criar Pix');
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Servidor GhostsPay rodando na porta ${port}`));