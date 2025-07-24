import axios from 'axios';
import { API_URL } from './api';

export interface PaymentData {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  amount: number; // R$ 30.00 = 3000
  description: string;
}

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  pixCode?: string;
  qrCode?: string;
  expiresAt?: string;
  error?: string;
}

export const createPixPayment = async (data: PaymentData): Promise<PaymentResponse> => {
  try {
    const resp = await axios.post(`${API_URL}/api/pix/generate`, {
      nome: data.name,
      cpf: data.cpf,
      valor: (data.amount / 100).toFixed(2),
      descricao: data.description,
      email: data.email
    });

    return {
      success: true,
      transactionId: resp.data.transactionId,
      pixCode: resp.data.qrcode,
      qrCode: resp.data.qrcode,
      expiresAt: resp.data.expiresAt
    };
  } catch (error: any) {
    console.error('❌ Erro ao gerar Pix:', error);
    return {
      success: false,
      error: error.response?.data?.mensagem || error.message || 'Erro desconhecido'
    };
  }
};

export const checkPaymentStatus = async (transactionId: string): Promise<{
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  paidAt?: string;
}> => {
  try {
    const resp = await axios.post(`${API_URL}/api/pix/status`, { transactionId });
    return resp.data;
  } catch (error: any) {
    console.error('❌ Erro ao checar status do Pix:', error);
    throw error;
  }
};