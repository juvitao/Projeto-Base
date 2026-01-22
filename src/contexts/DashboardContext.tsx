import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

type ViewMode = 'client' | 'account' | 'all';

interface DashboardContextType {
    selectedClientId: string | null;
    selectedAccountId: string | null;
    selectedProfileId: string | null;
    viewMode: ViewMode;
    selectClient: (clientId: string) => void;
    selectAccount: (accountId: string) => void;
    setSelectedProfileId: (profileId: string | null) => void;
    resetSelection: () => void;
    profiles: any[];
    isLoading: boolean;
    refreshProfiles: () => Promise<void>;
    isAccountWizardOpen: boolean;
    setIsAccountWizardOpen: (open: boolean) => void;
    profilePhotoMap: Record<string, string>;
    cacheProfilePhoto: (userId: string, photoUrl: string) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [isAccountWizardOpen, setIsAccountWizardOpen] = useState(false);
    const [profilePhotoMap, setProfilePhotoMap] = useState<Record<string, string>>({});

    const cacheProfilePhoto = (userId: string, photoUrl: string) => {
        setProfilePhotoMap(prev => ({ ...prev, [userId]: photoUrl }));
    };

    const refreshProfiles = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const supabaseAny = supabase as any;
            const { data: workspace } = await supabaseAny
                .from('workspaces')
                .select('id')
                .eq('owner_id', user.id)
                .single();

            let workspaceId = workspace?.id;

            if (!workspaceId) {
                const { data: membership } = await supabaseAny
                    .from('team_members')
                    .select('workspace_id')
                    .eq('user_id', user.id)
                    .eq('status', 'active')
                    .single();
                workspaceId = membership?.workspace_id;
            }

            if (!workspaceId) return;

            const { data: connections } = await supabaseAny
                .from('fb_connections')
                .select('id, workspace_id, profile_name, fb_user_id, is_patriarch')
                .eq('workspace_id', workspaceId);

            const loadedProfiles = connections || [];
            setProfiles(loadedProfiles);

            // Check for saved profile ID in localStorage first
            const savedProfileId = localStorage.getItem('dashboard_selectedProfileId');
            if (savedProfileId && loadedProfiles.find((p: any) => p.id === savedProfileId)) {
                setSelectedProfileId(savedProfileId);
            } else if (!selectedProfileId && loadedProfiles.length > 0) {
                // Fallback to first profile
                const defaultProfile = loadedProfiles[0];
                setSelectedProfileId(defaultProfile.id);
                localStorage.setItem('dashboard_selectedProfileId', defaultProfile.id);
            }
        } catch (error) {
            console.error('Error refreshing profiles:', error);
        }
    };

    // Carregar estado inicial do localStorage ou primeira conta disponível
    useEffect(() => {
        const initializeState = async () => {
            setIsLoading(true);
            try {
                // Tentar recuperar do localStorage
                const savedClientId = localStorage.getItem('dashboard_selectedClientId');
                const savedAccountId = localStorage.getItem('dashboard_selectedAccountId');
                // const savedViewMode = localStorage.getItem('dashboard_viewMode') as ViewMode; // Not used

                if (savedAccountId) {
                    setSelectedAccountId(savedAccountId);
                    setViewMode('account');
                } else if (savedClientId) {
                    setSelectedClientId(savedClientId);
                    setViewMode('client');
                } else {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { data: account } = await supabase
                            .from('ad_accounts')
                            .select('id')
                            .eq('user_id', user.id)
                            .eq('status', 'ACTIVE')
                            .limit(1)
                            .maybeSingle();

                        if (account) {
                            selectAccount(account.id);
                        }
                    }
                }

                await refreshProfiles();
            } catch (error) {
                console.error("Erro ao inicializar DashboardContext:", error);
            } finally {
                setIsLoading(false);
            }
        };

        initializeState();
    }, []);

    const selectClient = (clientId: string) => {
        setSelectedClientId(clientId);
        setSelectedAccountId(null);
        setViewMode('client');
        localStorage.setItem('dashboard_selectedClientId', clientId);
        localStorage.removeItem('dashboard_selectedAccountId');
        localStorage.setItem('dashboard_viewMode', 'client');
    };

    const selectAccount = (accountId: string) => {
        setSelectedAccountId(accountId);
        setViewMode('account');
        localStorage.setItem('dashboard_selectedAccountId', accountId);
        localStorage.removeItem('dashboard_selectedClientId');
        localStorage.setItem('dashboard_viewMode', 'account');
    };

    const resetSelection = () => {
        setSelectedClientId(null);
        setSelectedAccountId(null);
        setViewMode('all');
        localStorage.removeItem('dashboard_selectedClientId');
        localStorage.removeItem('dashboard_selectedAccountId');
        localStorage.setItem('dashboard_viewMode', 'all');
    };

    return (
        <DashboardContext.Provider value={{
            selectedClientId,
            selectedAccountId,
            selectedProfileId,
            viewMode,
            selectClient,
            selectAccount,
            setSelectedProfileId: (profileId: string | null) => {
                setSelectedProfileId(profileId);
                if (profileId) {
                    localStorage.setItem('dashboard_selectedProfileId', profileId);
                } else {
                    localStorage.removeItem('dashboard_selectedProfileId');
                }
            },
            resetSelection,
            profiles,
            isLoading,
            refreshProfiles,
            isAccountWizardOpen,
            setIsAccountWizardOpen,
            profilePhotoMap,
            cacheProfilePhoto
        }}>
            {children}
        </DashboardContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDashboard() {
    const context = useContext(DashboardContext);
    if (context === undefined) {
        throw new Error('useDashboard must be used within a DashboardProvider');
    }
    return context;
}
