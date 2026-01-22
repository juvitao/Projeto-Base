import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAccountType } from "@/contexts/AccountTypeContext";

export interface AgencyRole {
    id: string;
    workspace_id: string;
    name: string;
    permissions: string[]; // Competências/Tarefas
    created_at: string;
}

export function useAgencyRoles() {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const getWorkspaceId = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;

        const { data: wsData } = await supabase
            .from('workspaces')
            .select('id')
            .eq('owner_id', user.id)
            .single();

        return wsData?.id;
    };

    const rolesQuery = useQuery({
        queryKey: ['agency_roles'],
        queryFn: async () => {
            const workspaceId = await getWorkspaceId();
            if (!workspaceId) return [];

            const { data, error } = await (supabase as any)
                .from('agency_roles')
                .select('*')
                .eq('workspace_id', workspaceId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data as AgencyRole[];
        }
    });

    const createRole = useMutation({
        mutationFn: async ({ name, permissions }: { name: string; permissions: string[] }) => {
            const workspaceId = await getWorkspaceId();
            if (!workspaceId) throw new Error("Workspace not found");

            const { data, error } = await (supabase as any)
                .from('agency_roles')
                .insert({
                    workspace_id: workspaceId,
                    name,
                    permissions
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agency_roles'] });
            toast({ title: "Função criada com sucesso!" });
        },
        onError: (error: any) => {
            toast({ variant: "destructive", title: "Erro ao criar função", description: error.message });
        }
    });

    const updateRole = useMutation({
        mutationFn: async ({ id, name, permissions }: { id: string; name: string; permissions: string[] }) => {
            const { data, error } = await (supabase as any)
                .from('agency_roles')
                .update({
                    name,
                    permissions
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agency_roles'] });
            toast({ title: "Função atualizada com sucesso!" });
        },
        onError: (error: any) => {
            toast({ variant: "destructive", title: "Erro ao atualizar função", description: error.message });
        }
    });

    const deleteRole = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase as any)
                .from('agency_roles')
                .delete()
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['agency_roles'] });
            toast({ title: "Função removida" });
        },
        onError: (error: any) => {
            toast({ variant: "destructive", title: "Erro ao remover função", description: error.message });
        }
    });

    return {
        roles: rolesQuery.data || [],
        isLoading: rolesQuery.isLoading,
        createRole,
        updateRole,
        deleteRole
    };
}
