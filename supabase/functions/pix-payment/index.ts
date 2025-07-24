import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface PaymentData {
  name: string;
  email: string;
  cpf: string;
  phone: string;
  amount: number;
  description: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, data, transactionId } = await req.json()
    console.log('Received request:', { action, data: data ? 'present' : 'missing', transactionId })

    if (action === 'create') {
      const paymentData: PaymentData = data
      console.log('Creating payment for:', paymentData.email)

      // Mock implementation for development/testing
      // In production, replace this with actual payment gateway integration
      const mockTransactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      const mockPixCode = `00020126580014BR.GOV.BCB.PIX0136${paymentData.email}0210${paymentData.description.substring(0, 10)}5204000053039865802BR5915INDICAFACIL LTDA6009SAO PAULO61080540900062070503***6304${Math.random().toString(36).substring(2, 6).toUpperCase()}`
      
      // Mock QR Code (base64 encoded 1x1 pixel PNG)
      const mockQrCodeBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
      
      // Mock expiration time (30 minutes from now)
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString()

      console.log('Mock payment created successfully:', {
        transactionId: mockTransactionId,
        amount: paymentData.amount,
        expiresAt
      })
      
      return new Response(
        JSON.stringify({
          success: true,
          transactionId: mockTransactionId,
          pixCode: mockPixCode,
          qrCode: mockQrCodeBase64,
          expiresAt: expiresAt
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    if (action === 'check') {
      console.log('Checking payment status for transaction:', transactionId)

      // Mock status check - for development, randomly return paid status after some time
      // In production, this would check the actual payment gateway
      const mockStatuses = ['pending', 'pending', 'pending', 'paid'] // 25% chance of being paid
      const randomStatus = mockStatuses[Math.floor(Math.random() * mockStatuses.length)]
      
      console.log('Mock status check result:', randomStatus)
      
      return new Response(
        JSON.stringify({
          status: randomStatus,
          paidAt: randomStatus === 'paid' ? new Date().toISOString() : null
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    throw new Error('Ação inválida')

  } catch (error) {
    console.error('Error in pix-payment function:', error)
    
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