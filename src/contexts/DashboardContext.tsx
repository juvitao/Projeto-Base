import React, { createContext, useContext, useState } from 'react';

// Contexto mockado para evitar quebras de dependência de componentes migrados de outros sistemas
const DashboardContext = createContext<any>(null);

export const DashboardProvider = ({ children }: { children: React.ReactNode }) => {
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

    const refreshProfiles = () => { };

    return (
        <DashboardContext.Provider value={{
            workspaceId,
            setWorkspaceId,
            workspaces,
            selectedAccountId,
            setSelectedAccountId,
            refreshProfiles
        }}>
            {children}
        </DashboardContext.Provider>
    );
};

export const useDashboard = () => {
    const context = useContext(DashboardContext);
    if (!context) {
        // Fallback seguro caso o provider não esteja na árvore
        return {
            workspaceId: null,
            workspaces: [],
            selectedAccountId: null,
            refreshProfiles: () => { }
        };
    }
    return context;
};
