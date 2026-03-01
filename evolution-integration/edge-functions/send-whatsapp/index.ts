import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EVOLUTION_API_URL = 'https://evo.jotabot.site';
const EVOLUTION_API_KEY = 'JotaBotEVO2025_API_Key_Definitiva';

// @ts-ignore
Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { instanceName, groupId, text } = await req.json();

        if (!instanceName || !groupId || !text) {
            return new Response(
                JSON.stringify({ error: 'Missing required fields: instanceName, groupId, text' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        console.log(`📱 [WA-SEND] Instance: ${instanceName}, Group: ${groupId}`);

        // 1. Check connection state
        const stateRes = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
            headers: { 'apikey': EVOLUTION_API_KEY }
        });
        const stateData = await stateRes.json();
        const connState = stateData.instance?.state || stateData.state;
        console.log(`📱 [WA-SEND] Connection state: ${connState}`);

        // 2. If not open, try restart
        if (connState !== 'open') {
            console.log(`📱 [WA-SEND] Not open, restarting...`);
            await fetch(`${EVOLUTION_API_URL}/instance/restart/${instanceName}`, {
                method: 'PUT',
                headers: { 'apikey': EVOLUTION_API_KEY }
            });
            // Wait for reconnection
            await new Promise(r => setTimeout(r, 5000));
        }

        // 3. Send the message
        console.log(`📱 [WA-SEND] Sending text message...`);
        const sendRes = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': EVOLUTION_API_KEY
            },
            body: JSON.stringify({ number: groupId, text: text })
        });

        const sendData = await sendRes.text();
        console.log(`📱 [WA-SEND] Response status: ${sendRes.status}, body: ${sendData}`);

        if (!sendRes.ok) {
            // Try restart + retry
            if (sendData.includes('SessionError') || sendData.includes('No sessions')) {
                console.log(`📱 [WA-SEND] SessionError, restarting instance and retrying...`);

                // Delete and recreate to force fresh session
                await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
                    method: 'DELETE',
                    headers: { 'apikey': EVOLUTION_API_KEY }
                });
                await new Promise(r => setTimeout(r, 2000));

                await fetch(`${EVOLUTION_API_URL}/instance/restart/${instanceName}`, {
                    method: 'PUT',
                    headers: { 'apikey': EVOLUTION_API_KEY }
                });
                await new Promise(r => setTimeout(r, 8000));

                // Retry send
                const retryRes = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': EVOLUTION_API_KEY
                    },
                    body: JSON.stringify({ number: groupId, text: text })
                });

                const retryData = await retryRes.text();
                console.log(`📱 [WA-SEND] Retry response: ${retryRes.status}, body: ${retryData}`);

                if (!retryRes.ok) {
                    return new Response(
                        JSON.stringify({ error: 'Failed after retry', details: retryData }),
                        { status: retryRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                    );
                }

                return new Response(retryData, {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            return new Response(
                JSON.stringify({ error: 'Send failed', details: sendData }),
                { status: sendRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(sendData, {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        console.error('❌ [WA-SEND] Fatal error:', error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});
