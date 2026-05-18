import React, { createContext, useContext, useState } from 'react';

// Tipos do contexto de dashboard
interface Workspace {
    id: string;
    name: string;
    owner_id: string;
}

interface DashboardContextType {
    workspaceId: string | null;
    setWorkspaceId: (id: string | null) => void;
    workspaces: Workspace[];
    selectedAccountId: string | null;
    setSelectedAccountId: (id: string | null) => void;
    refreshProfiles: () => void;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export const DashboardProvider = ({ children }: { children: React.ReactNode }) => {
    const [workspaceId, setWorkspaceId] = useState<string | null>(null);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
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

export const useDashboard = (): DashboardContextType => {
    const context = useContext(DashboardContext);
    if (!context) {
        // Fallback seguro caso o provider não esteja na árvore
        return {
            workspaceId: null,
            setWorkspaceId: () => { },
            workspaces: [],
            selectedAccountId: null,
            setSelectedAccountId: () => { },
            refreshProfiles: () => { }
        };
    }
    return context;
};

