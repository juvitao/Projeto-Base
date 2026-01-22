import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { accountId, force } = await req.json()

        console.log('🔄 [SYNC] Iniciando sincronização...')
        console.log('📍 [SYNC] accountId recebido:', accountId)

        // 1. Get access token from fb_connections table
        const { data: connections, error: connError } = await supabase
            .from('fb_connections')
            .select('id, access_token, name')
            .eq('status', 'connected')
            .not('access_token', 'is', null)
            .limit(1)

        if (connError) {
            console.error('❌ [SYNC] Erro ao buscar fb_connections:', connError)
            throw connError
        }

        if (!connections || connections.length === 0) {
            console.log('⚠️ [SYNC] Nenhuma conexão Meta ativa encontrada')
            return new Response(
                JSON.stringify({ message: 'No active Meta connections found' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const accessToken = connections[0].access_token
        const connectionId = connections[0].id
        console.log(`✅ [SYNC] Token encontrado para conexão: ${connections[0].name}`)

        // 2. If no specific accountId, fetch all ad accounts for this connection
        let adAccountIds: string[] = []

        if (accountId) {
            // Normalize: ensure it has 'act_' prefix
            adAccountIds = [accountId.startsWith('act_') ? accountId : `act_${accountId}`]
        } else {
            // Fetch ad accounts from Meta API
            const accountsUrl = `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status&access_token=${accessToken}&limit=50`
            console.log('🌐 [SYNC] Buscando ad accounts do Meta...')

            const accountsResp = await fetch(accountsUrl)
            const accountsData = await accountsResp.json()

            if (accountsData.error) {
                console.error('❌ [SYNC] Meta API Error (accounts):', accountsData.error)
                throw new Error(`Meta API Error: ${accountsData.error.message}`)
            }

            // Filter for active accounts only (status 1 = ACTIVE)
            adAccountIds = (accountsData.data || [])
                .filter((acc: any) => acc.account_status === 1)
                .map((acc: any) => acc.id)

            console.log(`📊 [SYNC] Encontradas ${adAccountIds.length} contas ativas`)
        }

        if (adAccountIds.length === 0) {
            return new Response(
                JSON.stringify({ message: 'No active ad accounts to sync' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const results: any[] = []

        // 3. For each ad account, sync campaigns and insights
        for (const actId of adAccountIds) {
            try {
                console.log(`\n📁 [SYNC] Processando conta: ${actId}`)

                // 3.1 Fetch campaigns from Meta API
                const campaignsUrl = `https://graph.facebook.com/v21.0/${actId}/campaigns?fields=id,name,objective,status,daily_budget,lifetime_budget&filtering=[{"field":"effective_status","operator":"IN","value":["ACTIVE","PAUSED"]}]&access_token=${accessToken}&limit=100`

                const campaignsResp = await fetch(campaignsUrl)
                const campaignsData = await campaignsResp.json()

                if (campaignsData.error) {
                    console.error(`❌ [SYNC] Erro ao buscar campanhas para ${actId}:`, campaignsData.error)
                    results.push({ account: actId, status: 'error', error: campaignsData.error.message })
                    continue
                }

                const campaigns = campaignsData.data || []
                console.log(`📋 [SYNC] ${campaigns.length} campanhas encontradas`)

                // 3.2 Upsert campaigns to database
                for (const campaign of campaigns) {
                    const campaignPayload = {
                        id: campaign.id,
                        account_id: actId,
                        name: campaign.name,
                        objective: campaign.objective,
                        status: campaign.status,
                        daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null,
                        lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
                        last_updated_at: new Date().toISOString()
                    }

                    const { error } = await supabase
                        .from('campaigns')
                        .upsert(campaignPayload, { onConflict: 'id' })

                    if (error) {
                        console.error(`⚠️ [SYNC] Erro ao salvar campanha ${campaign.id}:`, error)
                    }
                }

                // 3.3 Fetch Insights (last 30 days, daily breakdown)
                const insightsUrl = `https://graph.facebook.com/v21.0/${actId}/insights?level=campaign&fields=campaign_id,spend,impressions,clicks,actions,action_values,purchase_roas,date_start,date_stop&time_increment=1&date_preset=last_30d&access_token=${accessToken}&limit=500`

                console.log('📊 [SYNC] Buscando insights...')
                const insightsResp = await fetch(insightsUrl)
                const insightsData = await insightsResp.json()

                if (insightsData.error) {
                    console.error(`❌ [SYNC] Erro ao buscar insights para ${actId}:`, insightsData.error)
                    results.push({
                        account: actId,
                        status: 'partial',
                        campaigns_count: campaigns.length,
                        insights_error: insightsData.error.message
                    })
                    continue
                }

                const insights = insightsData.data || []
                console.log(`📈 [SYNC] ${insights.length} registros de insights`)

                // 3.4 Process and upsert insights
                let insightsUpserted = 0
                for (const row of insights) {
                    // Calculate Revenue from action_values (purchase/omni_purchase)
                    let revenue = 0
                    if (row.action_values && Array.isArray(row.action_values)) {
                        const purchaseValue = row.action_values.find((av: any) =>
                            av.action_type === 'purchase' ||
                            av.action_type === 'omni_purchase' ||
                            av.action_type === 'offsite_conversion.fb_pixel_purchase'
                        )
                        if (purchaseValue) {
                            revenue = parseFloat(purchaseValue.value) || 0
                        }
                    }

                    // Calculate Conversions from actions
                    let conversions = 0
                    if (row.actions && Array.isArray(row.actions)) {
                        const purchaseAction = row.actions.find((a: any) =>
                            a.action_type === 'purchase' ||
                            a.action_type === 'omni_purchase' ||
                            a.action_type === 'offsite_conversion.fb_pixel_purchase'
                        )
                        if (purchaseAction) {
                            conversions = parseInt(purchaseAction.value) || 0
                        }
                    }

                    const spend = parseFloat(row.spend || '0')
                    const roas = spend > 0 ? revenue / spend : 0

                    const insightPayload = {
                        entity_id: row.campaign_id,
                        entity_type: 'CAMPAIGN',
                        date: row.date_start,
                        spend: spend,
                        impressions: parseInt(row.impressions || '0'),
                        clicks: parseInt(row.clicks || '0'),
                        revenue: revenue,
                        conversions: conversions,
                        roas: roas
                    }

                    const { error } = await supabase
                        .from('insights')
                        .upsert(insightPayload, {
                            onConflict: 'entity_id,entity_type,date'
                        })

                    if (error) {
                        console.error(`⚠️ [SYNC] Erro ao salvar insight:`, error)
                    } else {
                        insightsUpserted++
                    }
                }

                console.log(`✅ [SYNC] Conta ${actId}: ${campaigns.length} campanhas, ${insightsUpserted} insights`)

                results.push({
                    account: actId,
                    status: 'synced',
                    campaigns_count: campaigns.length,
                    insights_count: insightsUpserted
                })

            } catch (err: any) {
                console.error(`❌ [SYNC] Erro ao sincronizar conta ${actId}:`, err)
                results.push({ account: actId, status: 'error', error: err.message })
            }
        }

        console.log('\n✅ [SYNC] Sincronização concluída!')
        console.log('📊 [SYNC] Resultados:', JSON.stringify(results, null, 2))

        return new Response(
            JSON.stringify({
                success: true,
                results,
                synced_at: new Date().toISOString()
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('❌ [SYNC] Erro fatal:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
