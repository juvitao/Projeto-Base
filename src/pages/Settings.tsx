import { useState, useEffect } from "react";
import {
    Settings,
    User,
    Percent,
    Target,
    Save,
    Loader2,
    Phone,
    Mail,
    MapPin,
    Building2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
    display_name: string;
    phone: string;
    business_name: string;
    address: string;
    default_commission: string;
    monthly_goal: string;
}

const SettingsPage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);

    const STORAGE_KEY = `vora_settings_${user?.id ?? "anon"}`;

    const [profile, setProfile] = useState<UserProfile>({
        display_name: "",
        phone: "",
        business_name: "",
        address: "",
        default_commission: "30",
        monthly_goal: "5000",
    });

    // Load settings from localStorage
    useEffect(() => {
        if (!user) return;
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                setProfile({ ...profile, ...JSON.parse(saved) });
            } catch { /* ignore */ }
        } else {
            // Pre-fill email display name from Supabase user
            setProfile(p => ({
                ...p,
                display_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "",
            }));
        }
    }, [user]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
            toast({ title: "Configurações salvas!" });
        } catch (err: any) {
            toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const updateField = (field: keyof UserProfile, value: string) => {
        setProfile(p => ({ ...p, [field]: value }));
    };

    return (
        <div className="space-y-8 max-w-3xl mx-auto px-4 pb-20">
            {/* Header */}
            <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase flex items-center gap-3">
                    <Settings className="w-7 h-7 text-primary" /> Configurações
                </h1>
                <p className="text-muted-foreground text-sm">Personalize seu assistente de vendas</p>
            </div>

            {/* ======================== PERFIL ======================== */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" /> Dados Pessoais
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Nome de Exibição</Label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={profile.display_name}
                                    onChange={e => updateField("display_name", e.target.value)}
                                    className="pl-10 h-11"
                                    placeholder="Seu nome..."
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Telefone</Label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={profile.phone}
                                    onChange={e => updateField("phone", e.target.value)}
                                    className="pl-10 h-11"
                                    placeholder="(00) 00000-0000"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Nome do Negócio</Label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={profile.business_name}
                                    onChange={e => updateField("business_name", e.target.value)}
                                    className="pl-10 h-11"
                                    placeholder="Ex: Cosméticos da Maria"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Localização</Label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    value={profile.address}
                                    onChange={e => updateField("address", e.target.value)}
                                    className="pl-10 h-11"
                                    placeholder="Cidade, Estado"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Read-only email */}
                    <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Email (login)</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                            <Input
                                value={user?.email ?? ""}
                                disabled
                                className="pl-10 h-11 opacity-60 cursor-not-allowed"
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Autenticado via Supabase
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* ======================== VENDAS ======================== */}
            <Card>
                <CardHeader className="pb-4">
                    <CardTitle className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                        <Percent className="w-4 h-4 text-primary" /> Configurações de Venda
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Comissão Padrão (%)</Label>
                            <div className="relative">
                                <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={profile.default_commission}
                                    onChange={e => updateField("default_commission", e.target.value)}
                                    className="pl-10 h-11"
                                    placeholder="30"
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                Usado como valor inicial ao adicionar produtos ao estoque
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Meta Mensal (R$)</Label>
                            <div className="relative">
                                <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="number"
                                    min="0"
                                    step="100"
                                    value={profile.monthly_goal}
                                    onChange={e => updateField("monthly_goal", e.target.value)}
                                    className="pl-10 h-11"
                                    placeholder="5000"
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground">
                                Sua meta de vendas mensal (usado para referência no dashboard)
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ======================== SAVE ======================== */}
            <div className="flex justify-end pt-2">
                <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="gap-2 px-8 h-12 font-black uppercase text-xs tracking-wider"
                >
                    {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar Configurações
                </Button>
            </div>
        </div>
    );
};

export default SettingsPage;
