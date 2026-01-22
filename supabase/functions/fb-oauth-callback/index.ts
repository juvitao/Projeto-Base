import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state') // Contains returnUrl encoded
    const errorParam = url.searchParams.get('error')
    const errorReason = url.searchParams.get('error_reason')
    const errorDescription = url.searchParams.get('error_description')

    // Parse state to get return URL (format: "returnUrl|extra_data" or just returnUrl)
    // This allows redirecting back to localhost during development
    let appUrl = Deno.env.get('VITE_APP_URL') || 'https://app.leverag.digital'

    if (state) {
      try {
        // State can be a URL or URL-encoded URL
        const decodedState = decodeURIComponent(state)
        if (decodedState.startsWith('http://') || decodedState.startsWith('https://')) {
          // Extract base URL (remove path if any)
          const stateUrl = new URL(decodedState)
          appUrl = stateUrl.origin
          console.log('Using return URL from state:', appUrl)
        }
      } catch (e) {
        console.log('Could not parse state as URL, using default appUrl')
      }
    }

    // Handle OAuth errors from Facebook
    if (errorParam) {
      console.error('Facebook OAuth Error:', { errorParam, errorReason, errorDescription })
      return Response.redirect(`${appUrl}/connections?error=${encodeURIComponent(errorDescription || errorParam)}`)
    }

    if (!code) {
      return Response.redirect(`${appUrl}/connections?error=${encodeURIComponent('Codigo de autorizacao nao recebido')}`)
    }

    // Get environment variables
    const appId = Deno.env.get('VITE_FB_APP_ID')
    const appSecret = Deno.env.get('FB_APP_SECRET')
    const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/fb-oauth-callback`

    if (!appId || !appSecret) {
      console.error('Missing FB_APP_ID or FB_APP_SECRET')
      return Response.redirect(`${appUrl}/connections?error=${encodeURIComponent('Configuracao do servidor incompleta')}`)
    }

    // Exchange code for access token
    // Reference: https://developers.facebook.com/docs/facebook-login/guides/access-tokens
    const tokenUrl = `https://graph.facebook.com/v21.0/oauth/access_token?` +
      `client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&client_secret=${appSecret}` +
      `&code=${code}`

    console.log('Exchanging code for token...')

    const tokenResponse = await fetch(tokenUrl)
    const tokenData = await tokenResponse.json()

    if (tokenData.error) {
      console.error('Token exchange error:', tokenData.error)
      return Response.redirect(`${appUrl}/connections?error=${encodeURIComponent(tokenData.error.message || 'Erro ao trocar codigo por token')}`)
    }

    const accessToken = tokenData.access_token
    const expiresIn = tokenData.expires_in // seconds

    if (!accessToken) {
      return Response.redirect(`${appUrl}/connections?error=${encodeURIComponent('Token de acesso nao recebido')}`)
    }

    // Get user info from Facebook
    const meResponse = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name,email&access_token=${accessToken}`)
    const meData = await meResponse.json()

    if (meData.error) {
      console.error('Error fetching user info:', meData.error)
      return Response.redirect(`${appUrl}/connections?error=${encodeURIComponent(meData.error.message || 'Erro ao obter dados do usuario')}`)
    }

    console.log('User authenticated:', meData.name)

    // Exchange for long-lived token (optional but recommended - 60 days instead of ~2 hours)
    let longLivedToken = accessToken
    let tokenExpiry = new Date(Date.now() + (expiresIn || 3600) * 1000)

    try {
      const longLivedUrl = `https://graph.facebook.com/v21.0/oauth/access_token?` +
        `grant_type=fb_exchange_token` +
        `&client_id=${appId}` +
        `&client_secret=${appSecret}` +
        `&fb_exchange_token=${accessToken}`

      const longLivedResponse = await fetch(longLivedUrl)
      const longLivedData = await longLivedResponse.json()

      if (longLivedData.access_token) {
        longLivedToken = longLivedData.access_token
        tokenExpiry = new Date(Date.now() + (longLivedData.expires_in || 5184000) * 1000) // ~60 days
        console.log('Long-lived token obtained, expires:', tokenExpiry)
      }
    } catch (e) {
      console.warn('Could not exchange for long-lived token, using short-lived:', e)
    }

    // Save to database using service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // fb_connections table structure:
    // id, access_token, created_at, expires_at, instagram_actor_id, name, page_id, status, user_id, workspace_id
    // We need to insert with the correct fields

    // First, check if there's an existing connection for this FB user (by name match or we'll create new)
    const connectionData = {
      name: meData.name,
      access_token: longLivedToken,
      status: 'connected',
      expires_at: tokenExpiry.toISOString(),
      // Note: user_id and workspace_id would need to come from the authenticated user
      // For now, we'll leave them null and let the app handle association
    }

    // Try to find existing connection by name and update it, or insert new
    const { data: existingConnection } = await supabase
      .from('fb_connections')
      .select('id')
      .eq('name', meData.name)
      .maybeSingle()

    let dbError = null

    if (existingConnection) {
      // Update existing
      const { error } = await supabase
        .from('fb_connections')
        .update({
          access_token: longLivedToken,
          status: 'connected',
          expires_at: tokenExpiry.toISOString()
        })
        .eq('id', existingConnection.id)
      dbError = error
    } else {
      // Insert new
      const { error } = await supabase
        .from('fb_connections')
        .insert(connectionData)
      dbError = error
    }

    if (dbError) {
      console.error('Database error:', dbError)
      return Response.redirect(`${appUrl}/connections?error=${encodeURIComponent('Erro ao salvar conexao: ' + dbError.message)}`)
    }

    // Redirect back to app with success
    return Response.redirect(`${appUrl}/connections?meta=success&name=${encodeURIComponent(meData.name)}`)

  } catch (error: any) {
    console.error('fb-oauth-callback error:', error)
    const appUrl = Deno.env.get('VITE_APP_URL') || 'https://app.leverag.digital'
    return Response.redirect(`${appUrl}/connections?error=${encodeURIComponent(error.message || 'Erro interno')}`)
  }
})
