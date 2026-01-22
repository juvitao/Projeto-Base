import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { accountId } = await req.json()

        if (!accountId) {
            throw new Error('Missing account ID')
        }

        // Lookup ad_accounts to get Meta ID and Token
        const { data: account, error: accountError } = await supabase
            .from('ad_accounts')
            .select('account_id, access_token')
            .eq('id', accountId)
            .single()

        if (accountError || !account) {
            throw new Error('Conta não encontrada ou sem permissão')
        }

        // Fetch Pixels from Meta
        // Use account specific token if available, otherwise fallback (which is what we saved)
        if (!account.access_token) {
            throw new Error('Conta sem token de acesso');
        }

        const url = `https://graph.facebook.com/v18.0/${account.account_id}/ads_pixels?fields=id,name&access_token=${account.access_token}`

        const resp = await fetch(url)
        const data = await resp.json()

        if (data.error) {
            throw new Error(data.error.message)
        }

        const pixels = data.data || []

        return new Response(
            JSON.stringify({ pixels }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
