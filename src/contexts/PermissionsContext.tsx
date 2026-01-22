import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PermissionLevel = 'none' | 'view' | 'edit';

export interface PermissionsConfig {
    dashboard: PermissionLevel;
    clients: PermissionLevel;
    demands: PermissionLevel;
    products: PermissionLevel;
    connections: PermissionLevel;
    analytics: PermissionLevel;
    reports: PermissionLevel;
    settings_general: PermissionLevel;
    team: PermissionLevel;
    notifications: PermissionLevel;
    governance: PermissionLevel;
    [key: string]: PermissionLevel;
}

interface PermissionsContextValue {
    permissions: PermissionsConfig | null;
    isLoading: boolean;
    isAdmin: boolean; // Full access
    canView: (feature: keyof PermissionsConfig | string) => boolean;
    canEdit: (feature: keyof PermissionsConfig | string) => boolean;
    refreshPermissions: () => void;
}

// Default full access for admins/owners
const FULL_ACCESS: PermissionsConfig = {
    dashboard: 'edit',
    clients: 'edit',
    demands: 'edit',
    products: 'edit',
    connections: 'edit',
    analytics: 'edit',
    reports: 'edit',
    settings_general: 'edit',
    team: 'edit',
    notifications: 'edit',
    governance: 'edit',
};

const PermissionsContext = createContext<PermissionsContextValue | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
    const [permissions, setPermissions] = useState<PermissionsConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    const loadPermissions = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setPermissions(null);
                setIsAdmin(false);
                return;
            }

            // Check if user is workspace owner (has full access)
            const { data: ownedWorkspace } = await supabase
                .from('workspaces')
                .select('id')
                .eq('owner_id', user.id)
                .maybeSingle();

            if (ownedWorkspace) {
                // User is workspace owner - full access
                console.log('[Permissions] User is workspace owner, granting full access');
                setPermissions(FULL_ACCESS);
                setIsAdmin(true);
                return;
            }

            // User is a team member - find their access level
            const { data: memberData } = await (supabase as any)
                .from('team_members')
                .select(`
                    id,
                    role,
                    member_access_levels (
                        access_level_id,
                        agency_access_levels (
                            permissions_config
                        )
                    )
                `)
                .eq('email', user.email)
                .maybeSingle();

            if (memberData) {
                // Check if member has a custom access level
                const accessLevel = memberData.member_access_levels?.[0]?.agency_access_levels;

                console.log('[Permissions] Member data found:', {
                    memberId: memberData.id,
                    role: memberData.role,
                    hasAccessLevel: !!accessLevel,
                    permissionsConfig: accessLevel?.permissions_config
                });

                if (accessLevel?.permissions_config) {
                    console.log('[Permissions] Applying custom access level permissions');
                    setPermissions(accessLevel.permissions_config as PermissionsConfig);
                    setIsAdmin(false);
                } else if (memberData.role === 'admin') {
                    // Legacy admin role
                    console.log('[Permissions] Member has legacy admin role, granting full access');
                    setPermissions(FULL_ACCESS);
                    setIsAdmin(true);
                } else {
                    // Default restricted permissions for members without custom level
                    console.log('[Permissions] No custom level found, applying default view-only permissions');
                    setPermissions({
                        dashboard: 'view',
                        clients: 'view',
                        demands: 'view',
                        products: 'view',
                        connections: 'none',
                        analytics: 'view',
                        reports: 'view',
                        settings_general: 'none',
                        team: 'none',
                        notifications: 'none',
                        governance: 'none',
                    });
                    setIsAdmin(false);
                }
            } else {
                // User not found as team member or owner
                // For security, apply restricted access instead of full access
                console.log('[Permissions] User NOT found as owner or team member. Applying restricted access.');
                setPermissions({
                    dashboard: 'view',
                    clients: 'none',
                    demands: 'none',
                    products: 'none',
                    connections: 'none',
                    analytics: 'none',
                    reports: 'none',
                    settings_general: 'none',
                    team: 'none',
                    notifications: 'none',
                    governance: 'none',
                });
                setIsAdmin(false);
            }
        } catch (error) {
            console.error('[Permissions] Error loading permissions:', error);
            // Fallback to full access on error to avoid blocking users
            setPermissions(FULL_ACCESS);
            setIsAdmin(true);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadPermissions();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            loadPermissions();
        });

        return () => subscription.unsubscribe();
    }, []);

    const canView = (feature: keyof PermissionsConfig | string): boolean => {
        if (isAdmin) return true;
        if (!permissions) return false;
        const level = permissions[feature];
        return level === 'view' || level === 'edit';
    };

    const canEdit = (feature: keyof PermissionsConfig | string): boolean => {
        if (isAdmin) return true;
        if (!permissions) return false;
        return permissions[feature] === 'edit';
    };

    return (
        <PermissionsContext.Provider
            value={{
                permissions,
                isLoading,
                isAdmin,
                canView,
                canEdit,
                refreshPermissions: loadPermissions,
            }}
        >
            {children}
        </PermissionsContext.Provider>
    );
}

export function usePermissions() {
    const context = useContext(PermissionsContext);
    if (!context) {
        throw new Error('usePermissions must be used within a PermissionsProvider');
    }
    return context;
}
