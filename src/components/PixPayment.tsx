import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../lib/api';

const PixPayment = () => {
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [copiaCola, setCopiaCola] = useState('');
  const [erro, setErro] = useState('');

  const gerarPix = async () => {
    setLoading(true);
    setQrCode('');
    setCopiaCola('');
    setErro('');
    try {
      const response = await axios.post(`${API_URL}/api/pix/generate`, {
        nome: 'Nathan Rocha', // Troque para dados dinâmicos se quiser
        cpf: '12345678900',
        valor: '30.00', // Valor em string, conforme BSPAY
        descricao: 'Taxa de ativação'
      });
      setQrCode(response.data.imagemQrcode || '');
      setCopiaCola(response.data.qrcode || '');
    } catch (error: any) {
      setErro('Erro ao gerar Pix. Verifique se a BSPAY já liberou o produto e tente novamente.');
      console.error('Erro ao gerar cobrança Pix:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-4 border rounded-lg shadow-lg bg-white">
      <h2 className="text-2xl font-bold text-center mb-4">Pagamento via Pix</h2>
      <p className="text-center mb-4">Clique no botão abaixo para pagar a taxa de R$30,00:</p>
      <button
        onClick={gerarPix}
        disabled={loading}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
      >
        {loading ? 'Gerando Pix...' : 'Pagar R$30'}
      </button>
      {erro && (
        <div className="mt-4 text-red-600 text-center font-semibold">{erro}</div>
      )}
      {qrCode && (
        <div className="mt-6 text-center">
          <h3 className="font-semibold mb-2">Escaneie o QR Code:</h3>
          <img src={qrCode} alt="QR Code Pix" className="mx-auto" />
          <h3 className="mt-4 font-semibold">Ou copie e cole o código abaixo:</h3>
          <textarea
            className="w-full mt-2 p-2 border rounded"
            rows={4}
            value={copiaCola}
            readOnly
            onClick={(e) => (e.target as HTMLTextAreaElement).select()}
          />
        </div>
      )}
    </div>
  );
};

export default PixPayment;