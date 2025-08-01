import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Mapeamento dos produtos BSPay para créditos
const BSPAY_PRODUCTS = {
  'BSZDG3NDM3Y2': { credits: 25, price: 25, bonus: 5 }, // R$ 25
  'BSOGNKZJJKMJ': { credits: 50, price: 50, bonus: 10 }, // R$ 50
  'BSMDQWZGNIYJ': { credits: 100, price: 100, bonus: 25 }, // R$ 100
  'BSMZNJMGUWMM': { credits: 30, price: 30, bonus: 0 } // Taxa de ativação
}

serve(async (req) => {
  // Permitir CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar autenticação (usuário real ou chave anônima)
    const authHeader = req.headers.get('Authorization')
    let supabaseClient
    let authenticatedUser = null

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      
      // Tentar autenticar como usuário real primeiro
      try {
        supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          {
            global: {
              headers: { Authorization: authHeader },
            },
          }
        )

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
        if (user && !userError) {
          authenticatedUser = user
          console.log('Authenticated as user:', user.email)
        }
      } catch (error) {
        console.log('Not a valid user token, trying service role')
      }
    }

    // Se não conseguiu autenticar como usuário, usar service role
    if (!authenticatedUser) {
      supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )
      console.log('Using service role for webhook processing')
    }

    // Log para debug
    console.log('Webhook received:', req.method, req.url)

    const webhookData = await req.json()
    console.log('BSPay webhook data:', webhookData)

    // Extrair dados do webhook (formato pode variar dependendo do BSPay)
    let eventType, transactionId, productId, customerEmail, amount, status, paidAt

    // Tentar diferentes formatos de webhook
    if (webhookData.event_type) {
      // Formato esperado
      eventType = webhookData.event_type
      transactionId = webhookData.data?.transaction_id
      productId = webhookData.data?.product_id
      customerEmail = webhookData.data?.customer_email
      amount = webhookData.data?.amount
      status = webhookData.data?.status
      paidAt = webhookData.data?.paid_at
    } else if (webhookData.status) {
      // Formato alternativo
      eventType = 'payment.confirmed'
      transactionId = webhookData.transaction_id || webhookData.id
      productId = webhookData.product_id || webhookData.productId
      customerEmail = webhookData.customer_email || webhookData.email
      amount = webhookData.amount
      status = webhookData.status
      paidAt = webhookData.paid_at || webhookData.paidAt || new Date().toISOString()
    } else {
      // Formato genérico - tentar extrair dados
      eventType = webhookData.event_type || 'payment.confirmed'
      transactionId = webhookData.transaction_id || webhookData.id || `txn_${Date.now()}`
      productId = webhookData.product_id || webhookData.productId
      customerEmail = webhookData.customer_email || webhookData.email || webhookData.customer?.email
      amount = webhookData.amount || webhookData.value
      status = webhookData.status || 'paid'
      paidAt = webhookData.paid_at || webhookData.paidAt || new Date().toISOString()
    }

    console.log('Extracted data:', {
      eventType,
      transactionId,
      productId,
      customerEmail,
      amount,
      status
    })

    // Verificar se é um pagamento confirmado
    if (eventType !== 'payment.confirmed' && status !== 'paid' && status !== 'approved') {
      return new Response(
        JSON.stringify({ message: 'Event ignored - not a confirmed payment' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Se não tem productId, tentar identificar pelo amount
    if (!productId && amount) {
      if (amount === 25) productId = 'BSZDG3NDM3Y2'
      else if (amount === 50) productId = 'BSOGNKZJJKMJ'
      else if (amount === 100) productId = 'BSMDQWZGNIYJ'
      else if (amount === 30) productId = 'BSMZNJMGUWMM'
    }

    // Buscar o produto no mapeamento
    const product = BSPAY_PRODUCTS[productId]
    if (!product) {
      console.error('Unknown product ID:', productId, 'Amount:', amount)
      return new Response(
        JSON.stringify({ error: 'Unknown product', productId, amount }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Buscar usuário pelo email
    const { data: user, error: userError } = await supabaseClient
      .from('profiles')
      .select('id, credits, referred_by')
      .eq('email', customerEmail)
      .single()

    if (userError || !user) {
      console.error('User not found:', customerEmail)
      return new Response(
        JSON.stringify({ error: 'User not found', email: customerEmail }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se já processou este pagamento
    const { data: existingTransaction } = await supabaseClient
      .from('transactions')
      .select('id')
      .eq('reference_id', transactionId)
      .single()

    if (existingTransaction) {
      console.log('Payment already processed:', transactionId)
      return new Response(
        JSON.stringify({ message: 'Payment already processed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calcular créditos totais
    const totalCredits = product.credits + product.bonus

    // Adicionar créditos ao usuário
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({
        credits: (user.credits || 0) + totalCredits,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating user credits:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Registrar transação
    const { error: transactionError } = await supabaseClient
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'recharge',
        amount: product.price,
        description: `Recarga BSPay - ${product.credits} créditos (+${product.bonus} bônus)`,
        status: 'completed',
        reference_id: transactionId,
        metadata: {
          product_id: productId,
          credits: product.credits,
          bonus_credits: product.bonus,
          total_credits: totalCredits,
          payment_method: 'bspay',
          paid_at: paidAt,
          webhook_data: webhookData,
          processed_by: authenticatedUser?.email || 'service_role'
        }
      })

    if (transactionError) {
      console.error('Error creating transaction:', transactionError)
    }

    // Processar comissão de indicação se o usuário foi indicado
    if (user.referred_by) {
      try {
        console.log('Processing referral commission for user:', user.id, 'referred by:', user.referred_by)
        
        // Buscar o indicador
        const { data: referrer, error: referrerError } = await supabaseClient
          .from('profiles')
          .select('id, name, balance, total_earnings')
          .eq('id', user.referred_by)
          .single()

        if (referrerError || !referrer) {
          console.error('Error finding referrer:', referrerError)
        } else {
          // Adicionar comissão de R$ 30 ao indicador
          const commissionAmount = 30.00
          
          const { error: commissionError } = await supabaseClient
            .from('profiles')
            .update({
              balance: (referrer.balance || 0) + commissionAmount,
              total_earnings: (referrer.total_earnings || 0) + commissionAmount,
              updated_at: new Date().toISOString()
            })
            .eq('id', referrer.id)

          if (commissionError) {
            console.error('Error updating referrer commission:', commissionError)
          } else {
            // Registrar a comissão na tabela de transações
            const { error: commissionTransactionError } = await supabaseClient
              .from('transactions')
              .insert({
                user_id: referrer.id,
                type: 'commission',
                amount: commissionAmount,
                description: `Comissão de indicação - ${user.name || user.email}`,
                status: 'completed',
                reference_id: `commission_${transactionId}`,
                metadata: {
                  referred_user_id: user.id,
                  referred_user_name: user.name || user.email,
                  commission_type: 'referral',
                  original_transaction_id: transactionId
                }
              })

            if (commissionTransactionError) {
              console.error('Error creating commission transaction:', commissionTransactionError)
            } else {
              console.log('Referral commission processed successfully:', {
                referrer_id: referrer.id,
                referrer_name: referrer.name,
                commission_amount: commissionAmount,
                referred_user: user.name || user.email
              })
            }
          }
        }
      } catch (commissionError) {
        console.error('Error processing referral commission:', commissionError)
      }
    }

    console.log('Credits added successfully:', {
      user_id: user.id,
      email: customerEmail,
      credits_added: totalCredits,
      transaction_id: transactionId,
      product_id: productId,
      processed_by: authenticatedUser?.email || 'service_role'
    })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Credits added successfully',
        user_id: user.id,
        email: customerEmail,
        credits_added: totalCredits,
        transaction_id: transactionId,
        processed_by: authenticatedUser?.email || 'service_role'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing BSPay webhook:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
}) 