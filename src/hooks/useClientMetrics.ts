import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ClientMetrics {
    totalSpend: number;
    totalConversions: number;
    totalConversionValue: number;
    totalImpressions: number;
    totalClicks: number;
    totalReach: number;
    roas: number;
    cpc: number;
    ctr: number;
    cpa: number;
}

interface UseClientMetricsOptions {
    clientId: string | null;
    datePreset?: 'last_7d' | 'last_30d' | 'this_month' | 'today';
    startDate?: string;
    endDate?: string;
}

const INITIAL_METRICS: ClientMetrics = {
    totalSpend: 0,
    totalConversions: 0,
    totalConversionValue: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalReach: 0,
    roas: 0,
    cpc: 0,
    ctr: 0,
    cpa: 0,
};

export function useClientMetrics({ clientId, datePreset = 'last_7d', startDate, endDate }: UseClientMetricsOptions) {
    const [metrics, setMetrics] = useState<ClientMetrics>(INITIAL_METRICS);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastFetched, setLastFetched] = useState<Date | null>(null);

    const fetchMetrics = useCallback(async () => {
        if (!clientId) {
            setMetrics(INITIAL_METRICS);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // 1. Get client's selected ad accounts
            const { data: clientData, error: clientError } = await (supabase as any)
                .from('agency_clients')
                .select('selected_ad_accounts')
                .eq('id', clientId)
                .single();

            if (clientError) throw clientError;

            const adAccountIds = clientData?.selected_ad_accounts || [];

            if (adAccountIds.length === 0) {
                setMetrics(INITIAL_METRICS);
                setIsLoading(false);
                return;
            }

            // 2. Get access token from fb_connections
            const { data: connections, error: connError } = await (supabase as any)
                .from('fb_connections')
                .select('access_token')
                .eq('status', 'connected')
                .limit(1);

            if (connError) throw connError;

            if (!connections || connections.length === 0 || !connections[0].access_token) {
                setError('Nenhuma conexão Meta ativa encontrada');
                setMetrics(INITIAL_METRICS);
                setIsLoading(false);
                return;
            }

            const accessToken = connections[0].access_token;

            // 3. Call edge function to get insights
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const response = await fetch(`${supabaseUrl}/functions/v1/get-ad-insights`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    accessToken,
                    adAccountIds,
                    datePreset,
                    startDate,
                    endDate
                })
            });

            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // Calculate derived metrics
            const roas = data.totalSpend > 0 ? data.totalConversionValue / data.totalSpend : 0;
            const cpc = data.totalClicks > 0 ? data.totalSpend / data.totalClicks : 0;
            const ctr = data.totalImpressions > 0 ? (data.totalClicks / data.totalImpressions) * 100 : 0;
            const cpa = data.totalConversions > 0 ? data.totalSpend / data.totalConversions : 0;

            setMetrics({
                totalSpend: data.totalSpend || 0,
                totalConversions: data.totalConversions || 0,
                totalConversionValue: data.totalConversionValue || 0,
                totalImpressions: data.totalImpressions || 0,
                totalClicks: data.totalClicks || 0,
                totalReach: data.totalReach || 0,
                roas,
                cpc,
                ctr,
                cpa,
            });

            setLastFetched(new Date());

        } catch (err: any) {
            console.error('Error fetching client metrics:', err);
            setError(err.message || 'Erro ao buscar métricas');
            setMetrics(INITIAL_METRICS);
        } finally {
            setIsLoading(false);
        }
    }, [clientId, datePreset, startDate, endDate]);

    // Fetch on mount and when dependencies change
    useEffect(() => {
        fetchMetrics();
    }, [fetchMetrics]);

    return {
        metrics,
        isLoading,
        error,
        lastFetched,
        refetch: fetchMetrics
    };
}
