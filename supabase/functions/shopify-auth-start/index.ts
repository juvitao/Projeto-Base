import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = new URL(req.url)
  // Pega os dados da URL (o que aparece no seu print do navegador)
  let shop = url.searchParams.get('shop')
  let clientId = url.searchParams.get('clientId')

  // Se não estiver na URL, tenta pegar do corpo (JSON)
  if (!shop || !clientId) {
    try {
      const body = await req.json()
      shop = body.shop
      clientId = body.clientId
    } catch (e) { /* ignore */ }
  }

  if (!shop || !clientId) {
    return new Response(JSON.stringify({ error: "Faltam parâmetros: shop ou clientId" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }

  const redirectUri = "https://app.leverag.digital/api/shopify/callback"
  const scopes = Deno.env.get('SHOPIFY_SCOPES')
  const apiKey = Deno.env.get('SHOPIFY_CLIENT_ID')

  // Use encodeURIComponent em tudo o que for parâmetro de URL
  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${encodeURIComponent(scopes)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${clientId}`;

  // SE FOR GET (Navegador), redireciona automaticamente para a Shopify
  if (req.method === 'GET') {
    return Response.redirect(authUrl)
  }

  // SE FOR POST (API), retorna o JSON com a URL
  return new Response(JSON.stringify({ url: authUrl }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})