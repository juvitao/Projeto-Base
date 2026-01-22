// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

console.log("Edges Function File Loaded"); // Global scope log

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    console.log(">>> Request received:", req.method, req.url);

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        console.log(">>> Creating Supabase client...");
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        console.log(">>> Getting user from token...");
        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

        if (userError) {
            console.error(">>> User auth error:", userError);
        }

        if (!user) {
            console.log(">>> No user found, returning Unauthorized");
            throw new Error('Unauthorized');
        }

        console.log(">>> User authenticated:", user.id, user.email);

        const body = await req.json();
        console.log(">>> Request body:", body);
        const { email, role, workspace_id } = body;

        console.log(">>> Creating admin client...");
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        console.log(">>> Inviting user by email:", email);
        const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            data: {
                workspace_id: workspace_id
            }
        });

        console.log(">>> Invite result:", { inviteData, inviteError });

        if (inviteError) {
            if (inviteError.message.includes("already")) {
                console.log(">>> User already exists, will try to find them");
            } else {
                console.error(">>> Invite error:", inviteError);
                throw inviteError;
            }
        }

        let userId = inviteData?.user?.id;
        let initialStatus = 'invited';
        let confirmedAt = inviteData?.user?.email_confirmed_at;

        console.log(">>> User ID from invite:", userId);

        if (!userId) {
            console.log(">>> Looking up user by email...");
            const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
            const found = userData?.users?.find(u => u.email === email);
            if (found) {
                userId = found.id;
                confirmedAt = found.email_confirmed_at;
                console.log(">>> Found existing user:", userId, "Confirmed:", !!confirmedAt);
            }
        }

        if (!userId) {
            console.log(">>> Could not resolve user ID");
            throw new Error("Could not resolve User ID");
        }

        if (confirmedAt) {
            initialStatus = 'active';
            console.log(">>> User is already confirmed, setting status to active");
        }

        console.log(">>> Inserting into team_members with status:", initialStatus);
        const { error: dbError } = await supabaseAdmin
            .from('team_members')
            .insert({
                workspace_id: workspace_id,
                user_id: userId,
                email: email,
                role: role,
                status: initialStatus,
                invited_at: new Date().toISOString(),
                joined_at: confirmedAt ? new Date().toISOString() : null
            });

        if (dbError) {
            console.error(">>> DB error:", dbError);
            throw dbError;
        }

        console.log(">>> Success! Returning 200");
        return new Response(JSON.stringify({ success: true, user_id: userId }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (error) {
        console.error(">>> Caught error:", error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
