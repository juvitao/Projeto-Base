import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Plan {
    id: string;
    name: string;
    features_json: Record<string, boolean>;
    max_clients: number | null;
    price: number;
    has_ai_access: boolean;
}

const FEATURE_LABELS: Record<string, string> = {
    crm: "CRM / Clientes",
    stock: "Estoque",
    sales: "Vendas / PDV",
    financial: "Financeiro",
    dashboard: "Dashboard / BI",
    settings: "Configurações",
    whatsapp: "WhatsApp",
    bulk_import: "Importação em Lote",
    ai_assistant: "Assistente IA (Áudio/Texto)",
};

export default function AdminPlans() {
    const [plans, setPlans] = useState<Plan[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchPlans();
    }, []);

    const fetchPlans = async () => {
        setIsLoading(true);
        const { data } = await supabase
            .from("vora_plans")
            .select("*")
            .order("price");
        if (data) setPlans(data as unknown as Plan[]);
        setIsLoading(false);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const allFeatureKeys = Object.keys(FEATURE_LABELS);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-black uppercase tracking-tight">Planos</h1>
                <p className="text-muted-foreground text-sm">
                    Configuração dos planos de assinatura da plataforma
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map(plan => {
                    const isElite = plan.name === "Elite";
                    return (
                        <Card
                            key={plan.id}
                            className={`relative overflow-hidden ${
                                isElite ? "border-amber-500/50 shadow-lg shadow-amber-500/10" : ""
                            }`}
                        >
                            {isElite && (
                                <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" /> PREMIUM
                                </div>
                            )}
                            <CardHeader className="pb-2">
                                <CardTitle className="text-xl font-black uppercase tracking-tight">
                                    {plan.name}
                                </CardTitle>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-3xl font-black">
                                        {plan.price === 0 ? "Grátis" : `R$ ${plan.price.toFixed(2)}`}
                                    </span>
                                    {plan.price > 0 && (
                                        <span className="text-xs text-muted-foreground">/mês</span>
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                        {plan.max_clients === null ? "∞ clientes" : `${plan.max_clients} clientes`}
                                    </Badge>
                                    {plan.has_ai_access && (
                                        <Badge className="bg-amber-500 text-white text-xs gap-1">
                                            <Sparkles className="w-3 h-3" /> IA
                                        </Badge>
                                    )}
                                </div>

                                <div className="space-y-2 pt-2 border-t">
                                    {allFeatureKeys.map(key => {
                                        const enabled = plan.features_json?.[key] ?? false;
                                        return (
                                            <div
                                                key={key}
                                                className={`flex items-center gap-2 text-xs ${
                                                    enabled ? "text-foreground" : "text-muted-foreground/40 line-through"
                                                }`}
                                            >
                                                {enabled ? (
                                                    <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                ) : (
                                                    <X className="w-3.5 h-3.5 text-red-400/40 shrink-0" />
                                                )}
                                                {FEATURE_LABELS[key]}
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
