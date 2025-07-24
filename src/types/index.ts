export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  pixKey: string;
  referralCode: string;
  credits: number;
  balance: number;
  totalReferrals: number;
  isActive: boolean;
  createdAt: string;
  role?: 'user' | 'admin';
}

export interface Referral {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'pending' | 'active' | 'inactive';
  commission: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: 'commission' | 'bonus' | 'recharge' | 'withdrawal';
  amount: number;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  createdAt: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  signup: (data: any) => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  isLoading: boolean;
}