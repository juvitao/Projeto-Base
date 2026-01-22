import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useDashboard } from "@/contexts/DashboardContext";
import { useAccountType } from "@/contexts/AccountTypeContext";
import { format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { useTranslation } from "react-i18next";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Icons
import { Users, Plus, Trash2, Crown, Shield, UserCog, Loader2, Facebook, Link2, AlertCircle, CheckCircle, X } from "lucide-react";
import metaIcon from "@/assets/meta.svg";
import { useAgencyRoles } from "@/hooks/useAgencyRoles";
import { useAccessLevels } from "@/hooks/useAccessLevels";
import { CreateRoleModal } from "@/components/team/CreateRoleModal";
import { CreateAccessLevelModal } from "@/components/team/CreateAccessLevelModal";
import { EditMemberModal } from "@/components/team/EditMemberModal";
import { Pencil } from "lucide-react";

// Types
interface Workspace {
    id: string;
    name: string;
    owner_id: string;
    plan_type: 'owner' | 'agency';
    max_fb_profiles: number;
    max_members: number;
}

interface TeamMember {
    id: string;
    workspace_id: string;
    user_id: string;
    email: string;
    role: 'admin' | 'operator' | 'restricted';
    status: 'invited' | 'active';
    invited_at: string;
    joined_at?: string;
    member_roles?: { role_id: string; agency_roles: { name: string } }[];
    member_access_levels?: { access_level_id: string; agency_access_levels: { name: string } }[];
}

interface FBConnection {
    id: string;
    workspace_id: string;
    profile_name: string;
    fb_user_id: string;
    is_patriarch: boolean;
    connected_at: string;
    expires_at?: string;
}

interface TeamConnectionsProps {
    embedded?: boolean;
}

export default function TeamConnections({ embedded = false }: TeamConnectionsProps) {
    const { t, i18n } = useTranslation();
    const { toast } = useToast();
    const { isAgency } = useAccountType();
    const [activeTab, setActiveTab] = useState("members");

    const currentLocale = i18n.language.startsWith('pt') ? ptBR : enUS;

    // Data state
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [connections, setConnections] = useState<FBConnection[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Dialog state
    const [showInviteDialog, setShowInviteDialog] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<'admin' | 'operator' | 'restricted'>('operator'); // Legacy role
    const [inviteAgencyRoles, setInviteAgencyRoles] = useState<string[]>([]); // New custom roles
    const [isInviting, setIsInviting] = useState(false);

    // Edit Modal State
    // Edit Modal State
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);

    // Custom Roles Hook
    const { roles, deleteRole } = useAgencyRoles();
    const { levels, deleteLevel } = useAccessLevels();

    // Access Level and Role UI State
    const [levelToEdit, setLevelToEdit] = useState<any>(null);
    const [showCreateLevelModal, setShowCreateLevelModal] = useState(false);
    const [showManageLevelsModal, setShowManageLevelsModal] = useState(false);
    const [inviteAccessLevels, setInviteAccessLevels] = useState<string[]>([]);

    const [roleToEdit, setRoleToEdit] = useState<any>(null);
    const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);

    // Plan limits - Use isAgency to override plan_type check for UI testing
    const effectivePlanType = isAgency ? 'agency' : (workspace?.plan_type || 'owner');
    const effectiveMaxMembers = isAgency ? (Math.max(workspace?.max_members || 0, 5)) : (workspace?.max_members || 0);

    const canInviteMembers = effectivePlanType === 'agency' && members.length < effectiveMaxMembers;
    const canAddConnection = connections.length < (workspace?.max_fb_profiles || 0);

    useEffect(() => {
        loadWorkspaceData();
    }, []);

    const loadWorkspaceData = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get workspace
            const { data: wsData, error: wsError } = await supabase
                .from('workspaces')
                .select('*')
                .eq('owner_id', user.id)
                .maybeSingle();

            if (wsError) {
                console.error('Error loading workspace:', wsError);
            }

            if (wsData) {
                setWorkspace(wsData as Workspace);

                // Step 1: Get members first (Simple and robust)
                console.log(">>> Fetching members for workspace:", wsData.id);
                const { data: membersData, error: memError } = await (supabase as any)
                    .from('team_members')
                    .select('*')
                    .eq('workspace_id', wsData.id);

                if (memError) {
                    console.error('>>> Error fetching members:', memError);
                    return;
                }

                if (!membersData || membersData.length === 0) {
                    console.log(">>> No members found for workspace:", wsData.id);
                    setMembers([]);
                } else {
                    // Step 2: Enrich with relations (More robust than nested joins)
                    const memberIds = membersData.map((m: any) => m.id);

                    // Fetch Roles
                    const { data: rolesData } = await (supabase as any)
                        .from('member_roles')
                        .select('member_id, role_id, agency_roles(name)')
                        .in('member_id', memberIds);

                    // Fetch Access Levels
                    const { data: levelsData } = await (supabase as any)
                        .from('member_access_levels')
                        .select('member_id, access_level_id, agency_access_levels(name)')
                        .in('member_id', memberIds);

                    // Map them back
                    const enrichedMembers = membersData.map((m: any) => ({
                        ...m,
                        member_roles: rolesData?.filter((r: any) => r.member_id === m.id) || [],
                        member_access_levels: levelsData?.filter((l: any) => l.member_id === m.id) || []
                    }));

                    console.log(">>> Enriched members:", enrichedMembers.length);
                    setMembers(enrichedMembers as TeamMember[]);
                }

                // Get FB connections (without encrypted token)
                const { data: connectionsData } = await (supabase as any)
                    .from('fb_connections')
                    .select('id, workspace_id, profile_name, fb_user_id, is_patriarch, connected_at, expires_at')
                    .eq('workspace_id', wsData.id);

                setConnections((connectionsData || []) as FBConnection[]);
            }
        } catch (error) {
            console.error('Error loading workspace data:', error);
            toast({ title: t('common.error', 'Error'), description: t('team.error.load', 'Could not load data.'), variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const handleInviteMember = async () => {
        if (!workspace || !inviteEmail) return;

        setIsInviting(true);
        try {
            // Check plan limits (Frontend check only - Backend will verify actual DB plan)
            if (!isAgency && workspace.plan_type === 'owner') {
                toast({
                    title: t('team.error.plan_limit', 'Plan does not support members'),
                    description: t('team.error.upgrade_required', 'Upgrade to Agency plan to invite members.'),
                    variant: "destructive"
                });
                return;
            }

            if (members.length >= effectiveMaxMembers) {
                toast({
                    title: t('team.error.limit_reached', 'Limit reached'),
                    description: t('team.error.limit_reached_desc', { count: effectiveMaxMembers, defaultValue: `Your plan allows up to ${effectiveMaxMembers} members.` }),
                    variant: "destructive"
                });
                return;
            }

            let inviteError = null;
            try {
                // Invite user via Supabase Auth Admin API (requires Edge Function)
                console.log(">>> Calling Edge Function: invite-team-member");
                console.log(">>> Payload:", { workspace_id: workspace.id, email: inviteEmail, role: inviteRole });

                const { data, error } = await supabase.functions.invoke('invite-team-member', {
                    body: {
                        workspace_id: workspace.id,
                        email: inviteEmail,
                        role: inviteRole
                    }
                });

                console.log(">>> Edge Function Response:", { data, error });
                inviteError = error;
            } catch (err) {
                console.error(">>> Edge Function Exception:", err);
                inviteError = err;
            }

            if (inviteError) {
                console.warn("Edge Function failed or unresponsive, attempting manual fallback...", inviteError);
                // Fallback: Direct insert for UI testing purposes (Does not send email)
                const { error: fallbackError } = await (supabase as any)
                    .from('team_members')
                    .insert({
                        workspace_id: workspace.id,
                        user_id: null, // Allow null for invited members who haven't joined yet
                        email: inviteEmail,
                        role: inviteRole,
                        status: 'invited',
                        invited_at: new Date().toISOString()
                    });

                if (fallbackError) {
                    console.error("Manual fallback also failed:", fallbackError);
                    throw inviteError; // Throw the original function error if fallback also fails
                }

                toast({
                    title: t('team.invite_sent', 'Invite sent (Manual)'),
                    description: "Membro adicionado ao banco (Função de Email indisponível)."
                });
            } else {
                toast({ title: t('team.invite_sent', 'Invite sent!'), description: t('team.invite_sent_desc', { email: inviteEmail, defaultValue: `An email was sent to ${inviteEmail}.` }) });
            }

            // Handle Custom Roles and Access Levels Assignment
            if (inviteAgencyRoles.length > 0 || inviteAccessLevels.length > 0) {
                const { data: memberData } = await (supabase as any)
                    .from('team_members')
                    .select('id')
                    .eq('workspace_id', workspace.id)
                    .eq('email', inviteEmail)
                    .single();

                if (memberData) {
                    // Save Job Functions
                    if (inviteAgencyRoles.length > 0) {
                        const roleInserts = inviteAgencyRoles.map(roleId => ({
                            member_id: memberData.id,
                            role_id: roleId
                        }));
                        await (supabase as any).from('member_roles').insert(roleInserts);
                    }

                    // Save Access Levels
                    if (inviteAccessLevels.length > 0) {
                        const levelInserts = inviteAccessLevels.map(levelId => ({
                            member_id: memberData.id,
                            access_level_id: levelId
                        }));
                        await (supabase as any).from('member_access_levels').insert(levelInserts);
                    }
                }
            }

            setShowInviteDialog(false);
            setInviteEmail("");
            setInviteAgencyRoles([]);
            setInviteAccessLevels([]);
            loadWorkspaceData();

        } catch (error: any) {
            console.error('Error inviting member:', error);

            let errorMessage = error.message || t('common.unknown_error', "Unknown error");
            if (errorMessage.includes("FunctionsFetchError")) {
                errorMessage = t('team.error.function_unresponsive', "Invite function is not responding.");
            }

            toast({
                title: t('team.error.invite_failed', "Error inviting"),
                description: errorMessage,
                variant: "destructive"
            });
        } finally {
            setIsInviting(false);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        try {
            const { error } = await (supabase as any)
                .from('team_members')
                .delete()
                .eq('id', memberId);

            if (error) throw error;

            toast({ title: t('team.member_removed', "Member removed") });
            loadWorkspaceData();
        } catch (error: any) {
            toast({ title: t('common.error', "Error"), description: error.message, variant: "destructive" });
        }
    };

    const handleConnectMeta = async () => {
        if (!workspace) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast({ title: t('common.error', "Error"), description: t('common.auth_error', "User not authenticated."), variant: "destructive" });
                return;
            }

            // Meta OAuth configuration
            const FB_APP_ID = import.meta.env.VITE_FB_APP_ID || '123456789'; // Configure in .env
            const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
            const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/fb-oauth-callback`;
            const STATE = `${user.id}:${workspace.id}`; // user_id:workspace_id

            // Scopes for ads management
            const SCOPES = [
                'ads_management',
                'ads_read',
                'business_management',
                'pages_read_engagement',
                'pages_show_list',
                'catalog_management'
            ].join(',');

            const oauthUrl = `https://www.facebook.com/v24.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&state=${encodeURIComponent(STATE)}&scope=${encodeURIComponent(SCOPES)}`;

            // Redirect to Meta OAuth
            window.location.href = oauthUrl;

        } catch (error: any) {
            console.error('Error initiating OAuth:', error);
            toast({ title: t('common.error', "Error"), description: error.message, variant: "destructive" });
        }
    };

    const handleSetPatriarch = async (connectionId: string) => {
        try {
            // Remove patriarch from all, then set new one
            await (supabase as any)
                .from('fb_connections')
                .update({ is_patriarch: false })
                .eq('workspace_id', workspace?.id);

            await (supabase as any)
                .from('fb_connections')
                .update({ is_patriarch: true })
                .eq('id', connectionId);

            toast({ title: t('team.patriarch_updated', "Primary profile updated") });
            loadWorkspaceData();
        } catch (error: any) {
            toast({ title: t('common.error', "Error"), description: error.message, variant: "destructive" });
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin':
                return <Badge variant="default" className="bg-purple-600"><Shield className="w-3 h-3 mr-1" /> {t('team.roles.admin', 'Admin')}</Badge>;
            case 'operator':
                return <Badge variant="secondary"><UserCog className="w-3 h-3 mr-1" /> {t('team.roles.operator', 'Operator')}</Badge>;
            case 'restricted':
                return <Badge variant="outline">{t('team.roles.restricted', 'Restricted')}</Badge>;
            default:
                return <Badge variant="outline">{role}</Badge>;
        }
    };

    const getStatusBadge = (status: string) => {
        if (status === 'active') {
            return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> {t('team.status.active', 'Active')}</Badge>;
        }
        return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><AlertCircle className="w-3 h-3 mr-1" /> {t('team.status.pending', 'Pending')}</Badge>;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!workspace) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('team.title_full', 'Team & Connections')}</h1>
                    <p className="text-muted-foreground mt-2">{t('team.desc', 'Manage your team and connected profiles.')}</p>
                </div>
                <Card>
                    <CardContent className="py-12 text-center">
                        <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium">{t('team.no_workspace', 'No workspace found')}</h3>
                        <p className="text-muted-foreground mt-2">{t('team.no_workspace_desc', 'Please contact support.')}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header - Only show if not embedded */}
            {!embedded && (
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{t('team.title', 'Team')}</h1>
                        <p className="text-muted-foreground mt-2">
                            {t('team.members_desc', 'Manage your workspace members.')}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-sm py-1 px-3">
                            <Crown className="w-3 h-3 mr-1" />
                            {t('team.plan', 'Plan')} {effectivePlanType === 'owner' ? 'Owner' : 'Agency'}
                        </Badge>
                    </div>
                </div>
            )}

            {/* Members Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                        <CardTitle>{t('team.members_title', 'Team Members')}</CardTitle>
                        <CardDescription>
                            {effectivePlanType === 'owner'
                                ? t('team.upgrade_for_members', 'Your plan does not include team members. Upgrade to Agency.')
                                : t('team.members_limit', { count: effectiveMaxMembers, defaultValue: `You can invite up to ${effectiveMaxMembers} members.` })
                            }
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" className="gap-2" onClick={() => { setRoleToEdit(null); setShowCreateRoleModal(true); }}>
                            <Plus className="w-4 h-4" />
                            Criar Função
                        </Button>

                        <Button
                            variant="outline"
                            className="gap-2 border-primary/50 text-primary hover:bg-primary/5"
                            onClick={() => setShowManageLevelsModal(true)}
                        >
                            <Shield className="w-4 h-4" />
                            Níveis de Acesso
                        </Button>

                        {/* Modal de Gestão de Níveis de Acesso */}
                        <Dialog open={showManageLevelsModal} onOpenChange={setShowManageLevelsModal}>
                            <DialogContent className="sm:max-w-[700px]">
                                <DialogHeader>
                                    <DialogTitle>Níveis de Acesso (Roles)</DialogTitle>
                                    <DialogDescription>
                                        Defina o que os membros desta role podem acessar no sistema.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-4 max-h-[60vh] overflow-y-auto">
                                    {levels.map(level => (
                                        <div key={level.id} className="flex flex-col p-2 bg-muted/30 rounded-lg border text-[10px] relative group hover:border-primary/40 transition-all">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-bold text-sm">{level.name}</span>
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 hover:text-primary hover:bg-primary/10"
                                                        onClick={() => {
                                                            setLevelToEdit(level);
                                                            setShowCreateLevelModal(true);
                                                        }}
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => {
                                                            if (confirm(`Excluir o nível ${level.name}?`)) deleteLevel.mutate(level.id);
                                                        }}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {Object.entries(level.permissions_config).map(([feat, lvl]) => (
                                                    lvl !== 'none' && (
                                                        <span key={feat} className="bg-background px-1 py-0.5 rounded border border-border/50 text-[9px] capitalize">
                                                            {feat.substring(0, 3)}: {lvl === 'edit' ? 'FULL' : 'READ'}
                                                        </span>
                                                    )
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {levels.length === 0 && (
                                        <div className="col-span-full text-center py-8 text-muted-foreground italic">
                                            Nenhum nível de acesso criado.
                                        </div>
                                    )}
                                </div>
                                <DialogFooter>
                                    <Button className="w-full gap-2" onClick={() => { setLevelToEdit(null); setShowCreateLevelModal(true); }}>
                                        <Plus className="w-4 h-4" />
                                        Criar Novo Nível de Acesso
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>

                        <CreateAccessLevelModal
                            open={showCreateLevelModal}
                            onOpenChange={setShowCreateLevelModal}
                            levelToEdit={levelToEdit}
                        />

                        <CreateRoleModal
                            open={showCreateRoleModal}
                            onOpenChange={setShowCreateRoleModal}
                            roleToEdit={roleToEdit}
                        />

                        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
                            <DialogTrigger asChild>
                                <Button disabled={!canInviteMembers}>
                                    <Plus className="w-4 h-4 mr-2" /> {t('team.invite_member', 'Invite Member')}
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{t('team.invite_member', 'Invite Member')}</DialogTitle>
                                    <DialogDescription>
                                        {t('team.invite_desc', 'Send an email invite to add a new member to your workspace.')}
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="membro@empresa.com"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                        />
                                    </div>
                                    {/* Selection for Custom Roles (Job Functions) */}
                                    <div className="space-y-3 pt-2">
                                        <Label className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-blue-500" />
                                            Funções / Cargos (Competências)
                                        </Label>
                                        <div className="flex flex-wrap gap-2">
                                            {roles.map(role => (
                                                <div
                                                    key={role.id}
                                                    onClick={() => {
                                                        setInviteAgencyRoles(prev =>
                                                            prev.includes(role.id)
                                                                ? prev.filter(id => id !== role.id)
                                                                : [...prev, role.id]
                                                        );
                                                    }}
                                                    className={`
                                                        cursor-pointer px-3 py-1.5 rounded-full border text-xs transition-all flex items-center gap-2
                                                        ${inviteAgencyRoles.includes(role.id)
                                                            ? 'bg-blue-500/20 border-blue-500 text-blue-600'
                                                            : 'bg-background border-border text-muted-foreground hover:border-primary/50'
                                                        }
                                                    `}
                                                >
                                                    {role.name}
                                                    {inviteAgencyRoles.includes(role.id) && <CheckCircle className="w-3 h-3" />}
                                                </div>
                                            ))}
                                            {roles.length === 0 && (
                                                <p className="text-xs text-muted-foreground italic">Nenhuma função criada.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Selection for Access Levels (Permissions) */}
                                    <div className="space-y-3 pt-2 border-t mt-4">
                                        <Label className="flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-primary" />
                                            Níveis de Acesso (Permissões)
                                        </Label>
                                        <div className="flex flex-wrap gap-2">
                                            {levels.map(level => (
                                                <div
                                                    key={level.id}
                                                    onClick={() => {
                                                        const isSelected = inviteAccessLevels.includes(level.id);
                                                        if (isSelected) {
                                                            setInviteAccessLevels([]);
                                                        } else {
                                                            setInviteAccessLevels([level.id]); // Limit to 1
                                                        }
                                                    }}
                                                    className={`
                                                        cursor-pointer px-3 py-1.5 rounded-full border text-xs transition-all flex items-center gap-2
                                                        ${inviteAccessLevels.includes(level.id)
                                                            ? 'bg-primary/20 border-primary text-primary'
                                                            : 'bg-background border-border text-muted-foreground hover:border-primary/50'
                                                        }
                                                    `}
                                                >
                                                    {level.name}
                                                    {inviteAccessLevels.includes(level.id) && <CheckCircle className="w-3 h-3" />}
                                                </div>
                                            ))}
                                            {levels.length === 0 && (
                                                <p className="text-xs text-muted-foreground italic">Nenhum nível de acesso criado.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                                        {t('common.cancel', 'Cancel')}
                                    </Button>
                                    <Button onClick={handleInviteMember} disabled={isInviting || !inviteEmail}>
                                        {isInviting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                                        {t('team.send_invite', 'Send Invite')}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    {/* Job Functions List (Cargos) */}
                    {roles.length > 0 && (
                        <div id="roles-section" className="mb-4 p-1.5 bg-muted/20 rounded-lg border border-border/50">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-2 px-1">
                                <Users className="w-3 h-3 text-primary" />
                                Funções & Cargos (Competências)
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                {roles.map(role => (
                                    <div key={role.id} className="flex flex-col p-2 bg-background rounded-lg border text-[10px] relative group hover:border-primary/40 transition-all">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-bold truncate max-w-[80px]">{role.name}</span>
                                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5 hover:text-primary hover:bg-primary/10"
                                                    onClick={() => {
                                                        setRoleToEdit(role);
                                                        setShowCreateRoleModal(true);
                                                    }}
                                                >
                                                    <Pencil className="w-2.5 h-2.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5 hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => {
                                                        if (confirm(`Excluir a função "${role.name}"?`)) deleteRole.mutate(role.id);
                                                    }}
                                                >
                                                    <Trash2 className="w-2.5 h-2.5" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {role.permissions && role.permissions.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {role.permissions.slice(0, 3).map((p: string) => (
                                                        <span key={p} className="text-[8px] bg-primary/5 text-primary px-1 py-0.5 rounded-full border border-primary/10">{p}</span>
                                                    ))}
                                                    {role.permissions.length > 3 && <span className="text-[8px] text-muted-foreground">+{role.permissions.length - 3}</span>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Access Levels List (Roles) */}
                    {levels.length > 0 && (
                        <div id="levels-section" className="mb-4 p-1.5 bg-muted/20 rounded-lg border border-border/10">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-2 px-1">
                                <Shield className="w-3 h-3 text-orange-500" />
                                Perfis de Acesso Disponíveis
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                {levels.map(level => (
                                    <div key={level.id} className="flex flex-col p-2 bg-background/50 rounded-lg border border-dashed text-[10px]">
                                        <span className="font-bold truncate mb-1">{level.name}</span>
                                        <div className="flex flex-wrap gap-1">
                                            {Object.entries(level.permissions_config).slice(0, 3).map(([feat, lvl]) => (
                                                lvl !== 'none' && (
                                                    <span key={feat} className="text-[8px] text-muted-foreground">{feat.substring(0, 2)}:{lvl === 'edit' ? 'E' : 'V'}</span>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {members.length === 0 ? (
                        <div className="text-center py-12 border rounded-md border-dashed">
                            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium">{t('team.no_members', 'No team members')}</h3>
                            <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
                                {effectivePlanType === 'owner'
                                    ? t('team.upgrade_for_members', 'Upgrade to Agency plan to invite members.')
                                    : t('team.invite_to_start', "Click 'Invite Member' to add people to your workspace.")
                                }
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead>{t('team.table.role', 'Permissões & Cargos')}</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>{t('team.table.invited_at', 'Invited at')}</TableHead>
                                    <TableHead className="text-right">{t('team.table.actions', 'Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {members.map((member) => (
                                    <TableRow key={member.id}>
                                        <TableCell className="font-medium">{member.email}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                {/* Access Levels (Permissions) */}
                                                <div className="flex flex-wrap gap-1">
                                                    {member.member_access_levels?.map(al => (
                                                        <Badge key={al.access_level_id} variant="default" className="bg-primary/80 text-[9px] h-4">
                                                            <Shield className="w-2.5 h-2.5 mr-1" /> {al.agency_access_levels.name}
                                                        </Badge>
                                                    ))}
                                                    {(!member.member_access_levels || member.member_access_levels.length === 0) && member.role === 'admin' && (
                                                        <Badge variant="default" className="bg-purple-600 text-[9px] h-4">
                                                            <Crown className="w-2.5 h-2.5 mr-1" /> Admin
                                                        </Badge>
                                                    )}
                                                </div>
                                                {/* Job Functions (Roles) */}
                                                <div className="flex flex-wrap gap-1">
                                                    {member.member_roles?.map(mr => (
                                                        <Badge key={mr.role_id} variant="outline" className="text-[9px] h-4 border-blue-500/50 text-blue-600">
                                                            <Users className="w-2.5 h-2.5 mr-1" /> {mr.agency_roles.name}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(member.status)}</TableCell>
                                        <TableCell className="text-muted-foreground text-[10px]">
                                            {format(new Date(member.invited_at), i18n.language.startsWith('pt') ? "dd/MM/yyyy" : "MM/dd/yyyy", { locale: currentLocale })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    setEditingMember(member);
                                                    setShowEditModal(true);
                                                }}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="hover:text-destructive"
                                                onClick={() => handleRemoveMember(member.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <EditMemberModal
                member={editingMember}
                open={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setEditingMember(null);
                    loadWorkspaceData(); // Refresh list after edit
                }}
            />
        </div>
    );
}
