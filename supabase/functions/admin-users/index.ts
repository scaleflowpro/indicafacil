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
      // Get all users
      const { data: profiles, error: profilesError } = await supabaseClient
        .from('profiles')
        .select(`
          id,
          name,
          phone,
          pix_key,
          role,
          credits,
          balance,
          total_earnings,
          referral_code,
          created_at
        `)
        .neq('role', 'admin')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      // Get auth users to get emails
      const { data: authUsers, error: authError } = await supabaseClient.auth.admin.listUsers()
      if (authError) throw authError

      // Get referral counts
      const { data: referrals, error: referralsError } = await supabaseClient
        .from('referrals')
        .select('referrer_id')

      if (referralsError) throw referralsError

      // Combine data
      const users = profiles?.map(profile => {
        const authUser = authUsers.users.find(u => u.id === profile.id)
        const referralCount = referrals?.filter(r => r.referrer_id === profile.id).length || 0
        
        return {
          id: profile.id,
          name: profile.name || '',
          email: authUser?.email || '',
          phone: profile.phone || '',
          role: profile.role || 'user',
          credits: profile.credits || 0,
          balance: profile.balance || 0,
          total_earnings: profile.total_earnings || 0,
          referral_code: profile.referral_code || '',
          is_active: (profile.credits || 0) > 0,
          created_at: profile.created_at,
          total_referrals: referralCount
        }
      }) || []

      return new Response(
        JSON.stringify(users),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'POST') {
      const { action, userId, credits, isActive } = await req.json()

      if (action === 'updateStatus') {
        const { error } = await supabaseClient
          .from('profiles')
          .update({
            credits: isActive ? 30 : 0
          })
          .eq('id', userId)

        if (error) throw error

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (action === 'addCredits') {
        const { error } = await supabaseClient.rpc('add_user_credits', {
          user_id: userId,
          credit_amount: credits
        })

        if (error) throw error

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (action === 'addBalance') {
        const { amount } = await req.json()
        
        // Get current balance
        const { data: currentProfile, error: getError } = await supabaseClient
          .from('profiles')
          .select('balance')
          .eq('id', userId)
          .single()

        if (getError) throw getError

        const newBalance = (currentProfile.balance || 0) + amount
        
        // Update balance
        const { error: updateError } = await supabaseClient
          .from('profiles')
          .update({ balance: newBalance })
          .eq('id', userId)

        if (updateError) throw updateError

        // Create transaction record
        const { error: transactionError } = await supabaseClient
          .from('transactions')
          .insert({
            user_id: userId,
            type: amount > 0 ? 'bonus' : 'withdrawal',
            amount: amount,
            description: `Ajuste de saldo pelo administrador: ${amount > 0 ? '+' : ''}R$ ${amount.toFixed(2)}`,
            status: 'completed'
          })

        if (transactionError) {
          console.error('Error creating transaction record:', transactionError)
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