import axios from 'axios';
import { API_URL } from './api';

export interface RechargeData {
  packageId: number;
  name: string;
  email: string;
  cpf: string;
  phone: string;
}

export interface RechargeResponse {
  success: boolean;
  transactionId?: string;
  pixCode?: string;
  qrCode?: string;
  expiresAt?: string;
  amount?: number;
  credits?: number;
  bonusCredits?: number;
  error?: string;
}

export const createRecharge = async (data: RechargeData): Promise<RechargeResponse> => {
  try {
    const resp = await axios.post(`${API_URL}/api/pix/generate`, {
      nome: data.name,
      cpf: data.cpf,
      valor: data.packageId === 1 ? '10.00' : data.packageId === 2 ? '25.00' : data.packageId === 3 ? '50.00' : data.packageId === 4 ? '100.00' : '0.00',
      descricao: `Recarga de créditos - Pacote ${data.packageId}`,
      metadata: JSON.stringify({ email: data.email, phone: data.phone, packageId: data.packageId })
    });
    return {
      success: true,
      transactionId: resp.data.transactionId,
      pixCode: resp.data.qrcode,
      qrCode: resp.data.imagemQrcode || resp.data.qrcode,
      expiresAt: resp.data.expiresAt,
      amount: parseFloat(resp.data.valor) || undefined,
      credits: undefined, // Ajuste conforme resposta do backend
      bonusCredits: undefined // Ajuste conforme resposta do backend
    };
  } catch (error: any) {
    console.error('Error creating recharge:', error);
    return {
      success: false,
      error: error.response?.data || error.message || 'Erro desconhecido'
    };
  }
};

export const checkRechargeStatus = async (transactionId: string): Promise<{
  status: 'pending' | 'paid' | 'expired' | 'cancelled' | 'not_found';
  paidAt?: string;
  creditsAdded?: number;
}> => {
  try {
    const resp = await axios.post(`${API_URL}/api/pix/status`, { transactionId });
    return resp.data;
  } catch (error: any) {
    console.error('Error checking recharge status:', error);
    throw error;
  }
};