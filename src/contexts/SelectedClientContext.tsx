import { createContext, useContext, useState, ReactNode, useCallback, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Simplified client type for real data
interface RealClient {
    id: string;
    name: string;
    fee_fixed: number | null;
    commission_rate: number | null;
    calculation_base: string | null;
    created_at: string;
    assigned_products: string[] | null;
    logo_url: string | null;
    // UI-generated fields
    primaryColor?: string;
}

interface SelectedClientContextType {
    // Estado Base
    selectedClientId: string | null;
    selectedClientName: string | null;

    // Dados Expandidos
    clientData: RealClient | null;
    clients: RealClient[];
    isLoading: boolean;
    error: Error | null;

    // Ações
    setSelectedClient: (id: string | null) => void;
    refreshClientData: () => void;
}

const SelectedClientContext = createContext<SelectedClientContextType | undefined>(undefined);

// Generate a color based on client name
const generateColor = (name: string) => {
    const colors = ['#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#8B5CF6'];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
};

export function SelectedClientProvider({ children }: { children: ReactNode }) {
    // Initialize from localStorage if available
    const [selectedClientId, setSelectedClientIdState] = useState<string | null>(() => {
        return localStorage.getItem('lever_selected_client_id');
    });
    const queryClient = useQueryClient();

    // Fetch all clients from Supabase (excluding archived)
    const { data: clients = [], isLoading: isLoadingClients, error: clientsError } = useQuery({
        queryKey: ['clients'],
        queryFn: async () => {
            console.log('[SelectedClientContext] Fetching clients from Supabase...');
            const { data, error } = await (supabase as any)
                .from('agency_clients')
                .select('id, name, fee_fixed, commission_rate, calculation_base, created_at, assigned_products, logo_url, is_archived')
                .eq('is_archived', false) // Only fetch non-archived clients
                .order('created_at', { ascending: false });

            if (error) {
                console.error('[SelectedClientContext] Error fetching clients:', error);
                throw error;
            }
            console.log('[SelectedClientContext] Fetched clients:', data?.length || 0);
            return (data || []).map((c: RealClient) => ({
                ...c,
                primaryColor: generateColor(c.name)
            }));
        }
    });

    // Find the selected client from the list
    const clientData = useMemo(() => {
        if (!selectedClientId || !clients.length) return null;
        const found = clients.find((c: RealClient) => c.id === selectedClientId);
        if (!found) {
            console.warn('[SelectedClientContext] Client not found for ID:', selectedClientId);
        }
        return found || null;
    }, [selectedClientId, clients]);

    const selectedClientName = useMemo(() => {
        return clientData?.name || null;
    }, [clientData]);

    const setSelectedClient = useCallback((id: string | null) => {
        console.log('[SelectedClientContext] Setting selected client:', id);
        setSelectedClientIdState(id);
        if (id) {
            localStorage.setItem('lever_selected_client_id', id);
        } else {
            localStorage.removeItem('lever_selected_client_id');
        }
    }, []);

    const refreshClientData = useCallback(() => {
        console.log('[SelectedClientContext] Refreshing client data...');
        queryClient.invalidateQueries({ queryKey: ['clients'] });
    }, [queryClient]);

    const value = useMemo(() => ({
        selectedClientId,
        selectedClientName,
        clientData,
        clients,
        isLoading: isLoadingClients,
        error: clientsError as Error | null,
        setSelectedClient,
        refreshClientData,
    }), [selectedClientId, selectedClientName, clientData, clients, isLoadingClients, clientsError, setSelectedClient, refreshClientData]);

    return (
        <SelectedClientContext.Provider value={value}>
            {children}
        </SelectedClientContext.Provider>
    );
}

export function useSelectedClient() {
    const context = useContext(SelectedClientContext);
    if (!context) {
        throw new Error("useSelectedClient must be used within a SelectedClientProvider");
    }
    return context;
}
