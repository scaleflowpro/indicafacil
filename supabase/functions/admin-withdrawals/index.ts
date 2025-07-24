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

    if (req.method === 'GET') {
      // Get all withdrawals
      const { data: withdrawals, error } = await supabaseClient
        .from('withdrawals')
        .select(`
          id,
          user_id,
          amount,
          pix_key,
          status,
          fee,
          net_amount,
          reference,
          rejection_reason,
          processed_by,
          processed_at,
          created_at,
          profiles!withdrawals_user_id_fkey (
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get auth users to get emails
      const { data: authUsers, error: authError } = await supabaseClient.auth.admin.listUsers()
      if (authError) throw authError

      const adminWithdrawals = withdrawals?.map(w => {
        const authUser = authUsers.users.find(u => u.id === w.user_id)
        
        return {
          id: w.id,
          user_id: w.user_id,
          user_name: w.profiles?.name || 'Usuário não encontrado',
          user_email: authUser?.email || '',
          amount: w.amount,
          pix_key: w.pix_key,
          status: w.status,
          request_date: w.created_at,
          processed_date: w.processed_at,
          fee: w.fee || 0,
          net_amount: w.net_amount,
          reference: w.reference,
          rejection_reason: w.rejection_reason,
          processed_by: w.processed_by
        }
      }) || []

      return new Response(
        JSON.stringify(adminWithdrawals),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST') {
      const { action, withdrawalId, reason } = await req.json()

      if (action === 'approve') {
        const { error } = await supabaseClient
          .from('withdrawals')
          .update({
            status: 'completed',
            processed_by: user.id,
            processed_at: new Date().toISOString()
          })
          .eq('id', withdrawalId)

        if (error) throw error

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (action === 'reject') {
        // Get withdrawal details to refund user balance
        const { data: withdrawal, error: getError } = await supabaseClient
          .from('withdrawals')
          .select('user_id, amount')
          .eq('id', withdrawalId)
          .single()

        if (getError) throw getError

        // Update withdrawal status
        const { error: updateError } = await supabaseClient
          .from('withdrawals')
          .update({
            status: 'rejected',
            processed_by: user.id,
            processed_at: new Date().toISOString(),
            rejection_reason: reason
          })
          .eq('id', withdrawalId)

        if (updateError) throw updateError

        // Refund user balance
        const { error: refundError } = await supabaseClient.rpc('refund_withdrawal', {
          user_id: withdrawal.user_id,
          refund_amount: withdrawal.amount
        })

        if (refundError) {
          console.error('Error refunding balance:', refundError)
        }

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})