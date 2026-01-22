import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle, Shield, Users } from "lucide-react";
import { useAgencyRoles } from "@/hooks/useAgencyRoles";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useAccessLevels } from "@/hooks/useAccessLevels";

interface EditMemberModalProps {
    member: any;
    open: boolean;
    onClose: () => void;
}

export function EditMemberModal({ member, open, onClose }: EditMemberModalProps) {
    const { t } = { t: (key: string, def: string) => def }; // Mock t function or import existing hook if available
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { roles } = useAgencyRoles();
    const { levels } = useAccessLevels();

    const [role, setRole] = useState<'admin' | 'operator' | 'restricted'>('operator'); // Native role
    const [selectedAgencyRoles, setSelectedAgencyRoles] = useState<string[]>([]); // Job Functions
    const [selectedAccessLevels, setSelectedAccessLevels] = useState<string[]>([]); // Access Levels
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (member && open) {
            setRole(member.role);
            fetchData();
        }
    }, [member, open]);

    const fetchData = async () => {
        if (!member) return;

        // Fetch Job Functions (member_roles)
        const { data: jobData } = await (supabase as any).from('member_roles')
            .select('role_id')
            .eq('member_id', member.id);

        if (jobData) {
            setSelectedAgencyRoles(jobData.map((r: any) => r.role_id));
        }

        // Fetch Access Levels (member_access_levels)
        const { data: accessData } = await (supabase as any).from('member_access_levels')
            .select('access_level_id')
            .eq('member_id', member.id);

        if (accessData) {
            setSelectedAccessLevels(accessData.map((r: any) => r.access_level_id));
        }
    };

    const handleSave = async () => {
        if (!member) return;
        setIsLoading(true);

        try {
            // 1. Update main role
            const table: any = (supabase as any).from('team_members');
            const { error: roleError } = await table
                .update({ role })
                .eq('id', member.id);

            if (roleError) throw roleError;

            // 2. Update Job Functions
            await (supabase as any).from('member_roles').delete().eq('member_id', member.id);
            if (selectedAgencyRoles.length > 0) {
                const { error: insertError } = await (supabase as any).from('member_roles').insert(
                    selectedAgencyRoles.map(roleId => ({ member_id: member.id, role_id: roleId }))
                );
                if (insertError) throw insertError;
            }

            // 3. Update Access Levels
            await (supabase as any).from('member_access_levels').delete().eq('member_id', member.id);
            if (selectedAccessLevels.length > 0) {
                const { error: insertError } = await (supabase as any).from('member_access_levels').insert(
                    selectedAccessLevels.map(levelId => ({ member_id: member.id, access_level_id: levelId }))
                );
                if (insertError) throw insertError;
            }

            toast({ title: "Membro atualizado com sucesso!" });
            queryClient.invalidateQueries({ queryKey: ['team_members'] }); // You might need to make sure TeamConnections refetches
            onClose(); // Close modal which triggers parent refresh if wired correctly, strictly speaking we need to trigger re-fetch in parent

        } catch (error: any) {
            console.error(error);
            toast({ variant: "destructive", title: "Erro ao atualizar", description: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Editar Membro</DialogTitle>
                    <DialogDescription>
                        Gerencie as permissões e funções de {member?.email}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Access Levels (Permissions) Selection */}
                    <div className="space-y-4">
                        <Label className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-primary" />
                            Níveis de Acesso (Permissões)
                        </Label>
                        <div className="flex flex-wrap gap-2">
                            {levels.map(level => {
                                const isSelected = selectedAccessLevels.includes(level.id);
                                return (
                                    <div
                                        key={level.id}
                                        onClick={() => {
                                            if (isSelected) {
                                                setSelectedAccessLevels([]);
                                            } else {
                                                setSelectedAccessLevels([level.id]); // Limit to 1
                                            }
                                        }}
                                        className={`
                                            cursor-pointer px-3 py-1.5 rounded-full border text-xs transition-all flex items-center gap-2
                                            ${isSelected ? 'bg-primary/20 border-primary text-primary' : 'bg-background border-border text-muted-foreground'}
                                        `}
                                    >
                                        {level.name}
                                        {isSelected && <CheckCircle className="w-3 h-3" />}
                                    </div>
                                );
                            })}
                            {levels.length === 0 && (
                                <p className="text-xs text-muted-foreground italic">Nenhum nível de acesso criado.</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                        <Label className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            Funções de Trabalho (Cargos)
                        </Label>
                        <div className="flex flex-wrap gap-2">
                            {roles.map(role => {
                                const isSelected = selectedAgencyRoles.includes(role.id);
                                return (
                                    <div
                                        key={role.id}
                                        onClick={() => setSelectedAgencyRoles(prev =>
                                            prev.includes(role.id) ? prev.filter(id => id !== role.id) : [...prev, role.id]
                                        )}
                                        className={`
                                            cursor-pointer px-3 py-1.5 rounded-full border text-xs transition-all flex items-center gap-2
                                            ${isSelected ? 'bg-blue-500/20 border-blue-500 text-blue-600' : 'bg-background border-border text-muted-foreground'}
                                        `}
                                    >
                                        {role.name}
                                        {isSelected && <CheckCircle className="w-3 h-3" />}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Salvar Alterações
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
