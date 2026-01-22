import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const serve = (async (req: Request) => {
  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const shop = url.searchParams.get('shop')
    const clientId = url.searchParams.get('state')

    if (!code || !shop || !clientId) {
      return Response.redirect(`${Deno.env.get('VITE_APP_URL')}/connections?shopify=error&message=Missing+parameters`)
    }

    // Exchange code for access token
    const tokenResponse = await fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: Deno.env.get('VITE_SHOPIFY_CLIENT_ID'),
        client_secret: Deno.env.get('SHOPIFY_CLIENT_SECRET'),
        code,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (tokenData.error || !tokenData.access_token) {
      return Response.redirect(`${Deno.env.get('VITE_APP_URL')}/clients/${clientId}?shopify=error&message=${encodeURIComponent(tokenData.error_description || 'Failed to get access token')}`)
    }

    const access_token = tokenData.access_token

    // Fetch shop info to get shop name
    const shopInfoResponse = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
      headers: {
        'X-Shopify-Access-Token': access_token
      }
    })

    const shopInfoData = await shopInfoResponse.json()
    const shopName = shopInfoData?.shop?.name || shop

    // Save to database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { error: updateError } = await supabase
      .from('agency_clients')
      .update({
        shopify_access_token: access_token,
        shopify_domain: shop,
        shopify_shop_name: shopName,
        shopify_status: 'connected',
        shopify_connected_at: new Date().toISOString()
      })
      .eq('id', clientId)

    if (updateError) {
      console.error('Database update error:', updateError)
      return Response.redirect(`${Deno.env.get('VITE_APP_URL')}/clients/${clientId}?shopify=error&message=Database+error`)
    }

    return Response.redirect(`${Deno.env.get('VITE_APP_URL')}/clients/${clientId}?shopify=success&shop=${encodeURIComponent(shopName)}`)
  } catch (error) {
    console.error('Shopify OAuth callback error:', error)
    return Response.redirect(`${Deno.env.get('VITE_APP_URL')}/connections?shopify=error&message=${encodeURIComponent(error.message)}`)
  }
})

Deno.serve(serve)