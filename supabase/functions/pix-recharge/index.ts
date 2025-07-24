import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RechargeData {
  packageId: number;
  name: string;
  email: string;
  cpf: string;
  phone: string;
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

    // Verify the user is authenticated
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { action, data, transactionId } = await req.json()
    console.log('Received recharge request:', { action, userId: user.id })

    if (action === 'create') {
      const rechargeData: RechargeData = data
      console.log('Creating recharge for package:', rechargeData.packageId)

      // Define packages
      const packages = [
        { id: 1, credits: 10, price: 10, bonus: 0 },
        { id: 2, credits: 25, price: 25, bonus: 5 },
        { id: 3, credits: 50, price: 50, bonus: 10 },
        { id: 4, credits: 100, price: 100, bonus: 25 }
      ]

      const selectedPackage = packages.find(p => p.id === rechargeData.packageId)
      if (!selectedPackage) {
        return new Response(
          JSON.stringify({ success: false, error: 'Pacote inválido' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        )
      }

      // Generate mock payment data
      const mockTransactionId = `REC_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      
      // Generate a proper Pix code format
      const pixKey = rechargeData.email
      const merchantName = "INDICAFACIL LTDA"
      const merchantCity = "SAO PAULO"
      const amount = selectedPackage.price.toFixed(2)
      const description = `Recarga ${selectedPackage.credits} creditos`
      
      // Simplified Pix code for testing (in production, use proper Pix code generation)
      const mockPixCode = `00020126360014BR.GOV.BCB.PIX0114${pixKey}0208${description.substring(0, 8)}520400005303986540${amount.length}${amount}5802BR5913${merchantName}6009${merchantCity}62070503***6304ABCD`
      
      // Create a simple QR code placeholder (in production, use a real QR code generator)
      // Generate a more realistic QR code pattern
      const qrCodeSvg = `<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
        <rect width="200" height="200" fill="white"/>
        <!-- Corner markers -->
        <rect x="10" y="10" width="50" height="50" fill="black"/>
        <rect x="20" y="20" width="30" height="30" fill="white"/>
        <rect x="25" y="25" width="20" height="20" fill="black"/>
        
        <rect x="140" y="10" width="50" height="50" fill="black"/>
        <rect x="150" y="20" width="30" height="30" fill="white"/>
        <rect x="155" y="25" width="20" height="20" fill="black"/>
        
        <rect x="10" y="140" width="50" height="50" fill="black"/>
        <rect x="20" y="150" width="30" height="30" fill="white"/>
        <rect x="25" y="155" width="20" height="20" fill="black"/>
        
        <!-- Data pattern -->
        <rect x="70" y="30" width="5" height="5" fill="black"/>
        <rect x="80" y="30" width="5" height="5" fill="black"/>
        <rect x="90" y="35" width="5" height="5" fill="black"/>
        <rect x="100" y="40" width="5" height="5" fill="black"/>
        <rect x="110" y="30" width="5" height="5" fill="black"/>
        <rect x="120" y="35" width="5" height="5" fill="black"/>
        
        <rect x="30" y="70" width="5" height="5" fill="black"/>
        <rect x="40" y="75" width="5" height="5" fill="black"/>
        <rect x="50" y="80" width="5" height="5" fill="black"/>
        <rect x="60" y="85" width="5" height="5" fill="black"/>
        
        <rect x="70" y="70" width="5" height="5" fill="black"/>
        <rect x="85" y="75" width="5" height="5" fill="black"/>
        <rect x="95" y="80" width="5" height="5" fill="black"/>
        <rect x="105" y="85" width="5" height="5" fill="black"/>
        <rect x="115" y="90" width="5" height="5" fill="black"/>
        <rect x="125" y="95" width="5" height="5" fill="black"/>
        
        <!-- More data patterns -->
        <rect x="30" y="100" width="5" height="5" fill="black"/>
        <rect x="45" y="105" width="5" height="5" fill="black"/>
        <rect x="55" y="110" width="5" height="5" fill="black"/>
        <rect x="65" y="115" width="5" height="5" fill="black"/>
        <rect x="75" y="120" width="5" height="5" fill="black"/>
        <rect x="85" y="125" width="5" height="5" fill="black"/>
        
        <rect x="140" y="70" width="5" height="5" fill="black"/>
        <rect x="150" y="75" width="5" height="5" fill="black"/>
        <rect x="160" y="80" width="5" height="5" fill="black"/>
        <rect x="170" y="85" width="5" height="5" fill="black"/>
        
        <text x="100" y="180" text-anchor="middle" font-family="Arial" font-size="10" fill="black">PIX - R$ ${selectedPackage.price}</text>
      </svg>`
      
      const qrCodeBase64 = `data:image/svg+xml;base64,${btoa(qrCodeSvg)}`
      
      // Set expiration time (30 minutes from now)
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

      // Save payment record to database
      const { error: insertError } = await supabaseClient
        .from('pix_payments')
        .insert({
          user_id: user.id,
          amount: selectedPackage.price,
          credits: selectedPackage.credits,
          bonus_credits: selectedPackage.bonus,
          transaction_id: mockTransactionId,
          pix_code: mockPixCode,
          qr_code: qrCodeBase64,
          status: 'pending',
          expires_at: expiresAt
        })

      if (insertError) {
        console.error('Error saving payment:', insertError)
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao salvar pagamento' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        )
      }

      console.log('Payment record created successfully:', mockTransactionId)
      
      return new Response(
        JSON.stringify({
          success: true,
          transactionId: mockTransactionId,
          pixCode: mockPixCode,
          qrCode: qrCodeBase64,
          expiresAt: expiresAt,
          amount: selectedPackage.price,
          credits: selectedPackage.credits,
          bonusCredits: selectedPackage.bonus
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    if (action === 'check') {
      console.log('Checking payment status for transaction:', transactionId)

      // Get payment from database
      const { data: payment, error: paymentError } = await supabaseClient
        .from('pix_payments')
        .select('*')
        .eq('transaction_id', transactionId)
        .eq('user_id', user.id)
        .single()

      if (paymentError || !payment) {
        return new Response(
          JSON.stringify({ status: 'not_found' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
        )
      }

      // Check if payment is expired
      if (new Date(payment.expires_at) < new Date() && payment.status === 'pending') {
        await supabaseClient
          .from('pix_payments')
          .update({ status: 'expired' })
          .eq('id', payment.id)
        
        return new Response(
          JSON.stringify({ status: 'expired' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // For mock purposes, randomly mark as paid after some time
      if (payment.status === 'pending') {
        const timeSinceCreation = Date.now() - new Date(payment.created_at).getTime()
        const shouldBePaid = timeSinceCreation > 10000 && Math.random() > 0.7 // 30% chance after 10 seconds
        
        if (shouldBePaid) {
          // Process the payment
          const { data: processResult, error: processError } = await supabaseClient
            .rpc('process_pix_payment', { payment_transaction_id: transactionId })

          if (processError) {
            console.error('Error processing payment:', processError)
            return new Response(
              JSON.stringify({ status: 'error', error: processError.message }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
            )
          }

          console.log('Payment processed successfully:', processResult)

          return new Response(
            JSON.stringify({ 
              status: 'paid', 
              paidAt: new Date().toISOString(),
              creditsAdded: processResult.credits_added,
              bonusPaid: processResult.bonus_paid || 0,
              referrerId: processResult.referrer_id
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
      
      return new Response(
        JSON.stringify({ 
          status: payment.status,
          paidAt: payment.paid_at 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Ação inválida')

  } catch (error) {
    console.error('Error in pix-recharge function:', error)
    
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