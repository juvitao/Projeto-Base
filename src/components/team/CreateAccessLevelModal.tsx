import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shield } from "lucide-react";
import { useAccessLevels, AccessLevel } from "@/hooks/useAccessLevels";

const ACCESS_FEATURES = [
    // Navegação Principal
    { id: 'dashboard', label: 'Visão Geral (Dashboard)', group: 'Navegação' },
    { id: 'clients', label: 'Clientes', group: 'Navegação' },
    { id: 'demands', label: 'Demandas', group: 'Navegação' },
    { id: 'products', label: 'Produtos', group: 'Navegação' },
    { id: 'connections', label: 'Conexões', group: 'Navegação' },
    // Relatórios
    { id: 'analytics', label: 'Analytics', group: 'Relatórios' },
    { id: 'reports', label: 'Relatórios', group: 'Relatórios' },
    // Configurações
    { id: 'settings_general', label: 'Configurações Gerais', group: 'Configurações' },
    { id: 'team', label: 'Gestão de Equipe', group: 'Configurações' },
    { id: 'notifications', label: 'Notificações', group: 'Configurações' },
    { id: 'governance', label: 'Governança', group: 'Configurações' },
];

const DEFAULT_PERMISSIONS: Record<string, 'none' | 'view' | 'edit'> = {
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
};

interface CreateAccessLevelModalProps {
    levelToEdit?: AccessLevel | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreateAccessLevelModal({ levelToEdit, open, onOpenChange }: CreateAccessLevelModalProps) {
    const [name, setName] = useState("");
    const [permissionsConfig, setPermissionsConfig] = useState<Record<string, 'none' | 'view' | 'edit'>>(DEFAULT_PERMISSIONS);

    const { createLevel, updateLevel } = useAccessLevels();

    useEffect(() => {
        if (open) {
            if (levelToEdit) {
                setName(levelToEdit.name);
                // Merge with defaults in case new features were added
                setPermissionsConfig({ ...DEFAULT_PERMISSIONS, ...levelToEdit.permissions_config });
            } else {
                setName("");
                setPermissionsConfig(DEFAULT_PERMISSIONS);
            }
        }
    }, [open, levelToEdit]);

    const handleSave = async () => {
        if (!name.trim()) return;

        if (levelToEdit) {
            await updateLevel.mutateAsync({
                id: levelToEdit.id,
                name: name.trim(),
                permissions_config: permissionsConfig
            });
        } else {
            await createLevel.mutateAsync({
                name: name.trim(),
                permissions_config: permissionsConfig
            });
        }

        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{levelToEdit ? 'Editar Nível de Acesso' : 'Novo Nível de Acesso (Role)'}</DialogTitle>
                    <DialogDescription>
                        {levelToEdit ? 'Edite as permissões deste nível de acesso.' : 'Defina o que este perfil de acesso pode visualizar ou editar no sistema.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto">
                    <div className="space-y-2">
                        <Label>Nome do Nível (ex: Operador Pleno, Visualizador)</Label>
                        <Input
                            placeholder="Ex: Administrador, Operador, Marketing..."
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-4 pt-4 border-t">
                        <Label className="text-base flex items-center gap-2 font-bold">
                            <Shield className="w-4 h-4 text-primary" />
                            Matriz de Permissões
                        </Label>

                        {/* Group by category */}
                        {['Navegação', 'Relatórios', 'Configurações'].map(group => (
                            <div key={group} className="space-y-2">
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">{group}</p>
                                <div className="space-y-1">
                                    {ACCESS_FEATURES.filter(f => f.group === group).map(feature => (
                                        <div key={feature.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg border border-border/50">
                                            <p className="text-sm font-medium">{feature.label}</p>
                                            <div className="flex bg-background border rounded-md p-0.5 gap-0.5">
                                                {(['none', 'view', 'edit'] as const).map((level) => (
                                                    <button
                                                        key={level}
                                                        type="button"
                                                        onClick={() => setPermissionsConfig(prev => ({ ...prev, [feature.id]: level }))}
                                                        className={`
                                                            px-2 py-0.5 text-[10px] rounded transition-all
                                                            ${permissionsConfig[feature.id] === level
                                                                ? 'bg-primary text-primary-foreground shadow-sm'
                                                                : 'hover:bg-muted text-muted-foreground'
                                                            }
                                                        `}
                                                    >
                                                        {level === 'none' ? 'Bloqueado' : level === 'view' ? 'Ver' : 'Editar'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={createLevel.isPending || updateLevel.isPending || !name.trim()}>
                        {(createLevel.isPending || updateLevel.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {levelToEdit ? 'Salvar Alterações' : 'Criar Nível de Acesso'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
