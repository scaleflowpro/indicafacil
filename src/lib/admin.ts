import { supabase } from './supabase';

// Types for admin operations
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  credits: number;
  balance: number;
  total_earnings: number;
  referral_code: string;
  is_active: boolean;
  created_at: string;
  total_referrals: number;
}

export interface AdminWithdrawal {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  amount: number;
  pix_key: string;
  status: string;
  request_date: string;
  processed_date: string | null;
  fee: number;
  net_amount: number;
  reference: string;
  rejection_reason?: string;
  processed_by?: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalWithdrawals: number;
  pendingWithdrawals: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

// Helper function to get auth headers
const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('No authentication token');
  }
  
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  };
};

// Get the correct Supabase URL for edge functions
const getSupabaseUrl = () => {
  return import.meta.env.VITE_SUPABASE_URL || 'https://nsuoxowufivosxcchgqx.supabase.co';
};

// Get admin statistics
export const getAdminStats = async (): Promise<AdminStats> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${getSupabaseUrl()}/functions/v1/admin-stats`, {
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch admin stats');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    throw error;
  }
};

// Get all users for admin
export const getAdminUsers = async (): Promise<AdminUser[]> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${getSupabaseUrl()}/functions/v1/admin-users`, {
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch admin users');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching admin users:', error);
    throw error;
  }
};

// Get all withdrawals for admin
export const getAdminWithdrawals = async (): Promise<AdminWithdrawal[]> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${getSupabaseUrl()}/functions/v1/admin-withdrawals`, {
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch admin withdrawals');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching admin withdrawals:', error);
    throw error;
  }
};

// Approve withdrawal
export const approveWithdrawal = async (withdrawalId: string, adminId: string): Promise<void> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${getSupabaseUrl()}/functions/v1/admin-withdrawals`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'approve',
        withdrawalId
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to approve withdrawal');
    }
  } catch (error) {
    console.error('Error approving withdrawal:', error);
    throw error;
  }
};

// Reject withdrawal
export const rejectWithdrawal = async (
  withdrawalId: string, 
  adminId: string, 
  reason: string
): Promise<void> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${getSupabaseUrl()}/functions/v1/admin-withdrawals`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'reject',
        withdrawalId,
        reason
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reject withdrawal');
    }
  } catch (error) {
    console.error('Error rejecting withdrawal:', error);
    throw error;
  }
};

// Update user status (activate/deactivate)
export const updateUserStatus = async (userId: string, isActive: boolean): Promise<void> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${getSupabaseUrl()}/functions/v1/admin-users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'updateStatus',
        userId,
        isActive
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update user status');
    }
  } catch (error) {
    console.error('Error updating user status:', error);
    throw error;
  }
};

// Add credits to user
export const addCreditsToUser = async (userId: string, credits: number): Promise<void> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${getSupabaseUrl()}/functions/v1/admin-users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'addCredits',
        userId,
        credits
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add credits');
    }
  } catch (error) {
    console.error('Error adding credits to user:', error);
    throw error;
  }
};

// Add balance to user
export const addBalanceToUser = async (userId: string, amount: number): Promise<void> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${getSupabaseUrl()}/functions/v1/admin-users`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        action: 'addBalance',
        userId,
        amount
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update balance');
    }
  } catch (error) {
    console.error('Error updating balance:', error);
    throw error;
  }
};

// Get recent activity for admin dashboard
export const getRecentActivity = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${getSupabaseUrl()}/functions/v1/admin-activity`, {
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch recent activity');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    throw error;
  }
};