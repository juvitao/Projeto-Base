import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface InsightsRequest {
    accessToken?: string
    adAccountIds: string[]  // Array of ad account IDs (without 'act_' prefix)
    datePreset?: string     // e.g., 'last_7d', 'last_30d', 'this_month'
    startDate?: string      // YYYY-MM-DD format
    endDate?: string        // YYYY-MM-DD format
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        let { accessToken, adAccountIds, datePreset, startDate, endDate }: InsightsRequest = await req.json()

        // If no access token provided, fetch from fb_connections
        if (!accessToken) {
            const supabase = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
            )

            const { data: connections } = await supabase
                .from('fb_connections')
                .select('access_token')
                .eq('status', 'connected')
                .not('access_token', 'is', null)
                .limit(1)

            if (!connections || connections.length === 0 || !connections[0].access_token) {
                throw new Error('No active Meta connection found')
            }

            accessToken = connections[0].access_token
            console.log('🔑 [get-ad-insights] Token fetched from fb_connections')
        }

        if (!adAccountIds || adAccountIds.length === 0) {
            return new Response(
                JSON.stringify({
                    totalSpend: 0,
                    totalConversions: 0,
                    totalImpressions: 0,
                    totalClicks: 0,
                    totalReach: 0,
                    accounts: []
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Build date range params
        let timeRange = ''
        if (startDate && endDate) {
            timeRange = `&time_range={'since':'${startDate}','until':'${endDate}'}`
        } else {
            // Default to last 7 days
            const preset = datePreset || 'last_7d'
            timeRange = `&date_preset=${preset}`
        }

        // Fields to fetch
        const fields = 'spend,impressions,clicks,reach,actions,action_values,conversions,cost_per_action_type'

        // Fetch insights for each ad account
        const accountInsights = await Promise.all(
            adAccountIds.map(async (accountId) => {
                try {
                    // Ensure account ID has 'act_' prefix
                    const formattedId = accountId.startsWith('act_') ? accountId : `act_${accountId}`

                    const url = `https://graph.facebook.com/v21.0/${formattedId}/insights?fields=${fields}${timeRange}&access_token=${accessToken}`

                    const response = await fetch(url)
                    const data = await response.json()

                    if (data.error) {
                        console.error(`Error for account ${accountId}:`, data.error)
                        return {
                            accountId,
                            error: data.error.message,
                            spend: 0,
                            impressions: 0,
                            clicks: 0,
                            reach: 0,
                            conversions: 0,
                            conversionValue: 0
                        }
                    }

                    // Process insights data
                    const insights = data.data?.[0] || {}

                    // Extract conversions (purchases, leads, etc.)
                    let conversions = 0
                    let conversionValue = 0

                    if (insights.actions) {
                        // Look for purchase, lead, or omni_purchase actions
                        const purchaseAction = insights.actions.find((a: any) =>
                            a.action_type === 'purchase' ||
                            a.action_type === 'omni_purchase' ||
                            a.action_type === 'offsite_conversion.fb_pixel_purchase'
                        )
                        if (purchaseAction) {
                            conversions = parseInt(purchaseAction.value) || 0
                        }
                    }

                    if (insights.action_values) {
                        const purchaseValue = insights.action_values.find((a: any) =>
                            a.action_type === 'purchase' ||
                            a.action_type === 'omni_purchase' ||
                            a.action_type === 'offsite_conversion.fb_pixel_purchase'
                        )
                        if (purchaseValue) {
                            conversionValue = parseFloat(purchaseValue.value) || 0
                        }
                    }

                    return {
                        accountId,
                        spend: parseFloat(insights.spend) || 0,
                        impressions: parseInt(insights.impressions) || 0,
                        clicks: parseInt(insights.clicks) || 0,
                        reach: parseInt(insights.reach) || 0,
                        conversions,
                        conversionValue
                    }
                } catch (error: any) {
                    console.error(`Error fetching insights for ${accountId}:`, error)
                    return {
                        accountId,
                        error: error.message,
                        spend: 0,
                        impressions: 0,
                        clicks: 0,
                        reach: 0,
                        conversions: 0,
                        conversionValue: 0
                    }
                }
            })
        )

        // Calculate totals
        const totals = accountInsights.reduce((acc, account) => ({
            totalSpend: acc.totalSpend + account.spend,
            totalImpressions: acc.totalImpressions + account.impressions,
            totalClicks: acc.totalClicks + account.clicks,
            totalReach: acc.totalReach + account.reach,
            totalConversions: acc.totalConversions + account.conversions,
            totalConversionValue: acc.totalConversionValue + account.conversionValue
        }), {
            totalSpend: 0,
            totalImpressions: 0,
            totalClicks: 0,
            totalReach: 0,
            totalConversions: 0,
            totalConversionValue: 0
        })

        return new Response(
            JSON.stringify({
                ...totals,
                accounts: accountInsights,
                dateRange: {
                    preset: datePreset || 'last_7d',
                    startDate,
                    endDate
                }
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('get-ad-insights error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
