import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, UserCheck, UserX, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SellerRow {
    user_id: string;
    business_name: string | null;
    phone: string | null;
    role: string;
    plan_name: string;
    is_active: boolean;
    client_count: number;
    sale_count: number;
    total_revenue: number;
    created_at: string;
}

interface Plan {
    id: string;
    name: string;
}

export default function AdminUsers() {
    const { toast } = useToast();
    const [sellers, setSellers] = useState<SellerRow[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [statsRes, plansRes] = await Promise.all([
                supabase.rpc("admin_get_seller_stats"),
                supabase.from("vora_plans").select("id, name").order("price"),
            ]);
            if (statsRes.data) setSellers(statsRes.data as unknown as SellerRow[]);
            if (plansRes.data) setPlans(plansRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleActive = async (userId: string, currentlyActive: boolean) => {
        const { error } = await supabase
            .from("vora_profiles")
            .update({ is_active: !currentlyActive, updated_at: new Date().toISOString() } as any)
            .eq("user_id", userId);

        if (error) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } else {
            toast({ title: currentlyActive ? "Vendedora desativada" : "Vendedora reativada" });
            fetchData();
        }
    };

    const changePlan = async (userId: string, newPlanId: string) => {
        const { error } = await supabase
            .from("vora_profiles")
            .update({ plan_id: newPlanId, updated_at: new Date().toISOString() } as any)
            .eq("user_id", userId);

        if (error) {
            toast({ title: "Erro", description: error.message, variant: "destructive" });
        } else {
            toast({ title: "Plano alterado com sucesso!" });
            fetchData();
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight">Vendedoras</h1>
                    <p className="text-muted-foreground text-sm">{sellers.length} vendedoras cadastradas</p>
                </div>
                <Button variant="outline" size="sm" onClick={fetchData} className="gap-1.5">
                    <RefreshCw className="w-4 h-4" /> Atualizar
                </Button>
            </div>

            {sellers.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        Nenhuma vendedora cadastrada ainda.
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {sellers.map(seller => {
                        const currentPlan = plans.find(p => p.name === seller.plan_name);
                        return (
                            <Card key={seller.user_id} className={!seller.is_active ? "opacity-60" : ""}>
                                <CardContent className="py-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-sm truncate">
                                                    {seller.business_name || "Sem nome"}
                                                </h3>
                                                <Badge variant={seller.is_active ? "default" : "destructive"} className="text-[10px]">
                                                    {seller.is_active ? "ATIVA" : "INATIVA"}
                                                </Badge>
                                                <Badge variant="outline" className="text-[10px]">
                                                    {seller.plan_name}
                                                </Badge>
                                            </div>
                                            <div className="flex gap-4 text-xs text-muted-foreground">
                                                <span>{seller.phone || "Sem telefone"}</span>
                                                <span>{seller.client_count} clientes</span>
                                                <span>{seller.sale_count} vendas</span>
                                                <span>R$ {Number(seller.total_revenue).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground mt-1">
                                                Desde {new Date(seller.created_at).toLocaleDateString("pt-BR")}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Select
                                                value={currentPlan?.id ?? ""}
                                                onValueChange={(val) => changePlan(seller.user_id, val)}
                                            >
                                                <SelectTrigger className="w-[120px] h-8 text-xs">
                                                    <SelectValue placeholder="Plano" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {plans.map(p => (
                                                        <SelectItem key={p.id} value={p.id} className="text-xs">
                                                            {p.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <Button
                                                variant={seller.is_active ? "destructive" : "default"}
                                                size="sm"
                                                className="gap-1.5 text-xs h-8"
                                                onClick={() => toggleActive(seller.user_id, seller.is_active)}
                                            >
                                                {seller.is_active ? (
                                                    <><UserX className="w-3 h-3" /> Desativar</>
                                                ) : (
                                                    <><UserCheck className="w-3 h-3" /> Reativar</>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
