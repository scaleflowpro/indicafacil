import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the Authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify the user is authenticated and is admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if user is admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get user counts
    const { data: users, error: usersError } = await supabaseClient
      .from('profiles')
      .select('id, created_at, balance, total_earnings')
      .neq('role', 'admin')

    if (usersError) throw usersError

    // Get withdrawal counts
    const { data: withdrawals, error: withdrawalsError } = await supabaseClient
      .from('withdrawals')
      .select('id, amount, status, created_at')

    if (withdrawalsError) throw withdrawalsError

    const totalUsers = users?.length || 0
    const activeUsers = users?.filter(u => u.balance > 0 || u.total_earnings > 0).length || 0
    
    const totalWithdrawals = withdrawals?.length || 0
    const pendingWithdrawals = withdrawals?.filter(w => w.status === 'pending').length || 0
    
    const totalRevenue = users?.reduce((sum, u) => sum + (u.total_earnings || 0), 0) || 0
    
    // Calculate monthly revenue (current month)
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const monthlyRevenue = users?.filter(u => {
      const createdDate = new Date(u.created_at)
      return createdDate.getMonth() === currentMonth && createdDate.getFullYear() === currentYear
    }).reduce((sum, u) => sum + (u.total_earnings || 0), 0) || 0

    const stats = {
      totalUsers,
      activeUsers,
      totalWithdrawals,
      pendingWithdrawals,
      totalRevenue,
      monthlyRevenue
    }

    return new Response(
      JSON.stringify(stats),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})