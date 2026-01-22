import { Client } from "@/types/lever-os";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, DollarSign, Calendar, TrendingUp, Sparkles, Archive, Loader2, Trash2, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { InlineEditableName, EditableAvatar, InlineEditableValue } from "@/components/clients/InlineEditing";
import { ProductSelectorModal } from "@/components/clients/ProductSelector";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export const CALCULATION_BASE = {
    REVENUE: "revenue",
    SPEND: "spend",
} as const;

interface ClientHeaderProps {
    client: Client;
    clientId?: string;
    onClientUpdate?: () => void;
}

export function ClientHeader({ client: initialClient, clientId, onClientUpdate }: ClientHeaderProps) {
    const [client, setClient] = useState(initialClient);
    const [calculationBase, setCalculationBase] = useState<string>(
        (initialClient.financials as any).calculationBase || CALCULATION_BASE.REVENUE
    );
    const [isArchiving, setIsArchiving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const { toast } = useToast();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const startDate = new Date(client.financials.contractStartDate).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    const statusConfig = {
        onboarding: { label: "Onboarding", color: "bg-blue-500", bgLight: "bg-blue-500/10", text: "text-blue-500" },
        implementation: { label: "Implementação", color: "bg-amber-500", bgLight: "bg-amber-500/10", text: "text-amber-500" },
        growth: { label: "Escala & Growth", color: "bg-emerald-500", bgLight: "bg-emerald-500/10", text: "text-emerald-500" },
        churned: { label: "Encerrado", color: "bg-red-500", bgLight: "bg-red-500/10", text: "text-red-500" }
    };

    const currentStatus = statusConfig[client.status];

    const handleNameChange = (newName: string) => {
        setClient(prev => ({ ...prev, name: newName }));
        onClientUpdate?.();
    };

    const handleFeeChange = (newFee: number) => {
        setClient(prev => ({
            ...prev,
            financials: { ...prev.financials, fixedFee: newFee }
        }));
        onClientUpdate?.();
    };

    const handleCommissionChange = (newRate: number) => {
        setClient(prev => ({
            ...prev,
            financials: { ...prev.financials, variableFeePercentage: newRate }
        }));
        onClientUpdate?.();
    };

    const handleCalculationBaseChange = async (newBase: string) => {
        try {
            // Commented out for now as the DB column has a check constraint
            // Will just update local state for visual feedback
            setCalculationBase(newBase);
            toast({
                title: "Base de cálculo atualizada",
                description: newBase === CALCULATION_BASE.SPEND ? "Comissão sobre investimento" : "Comissão sobre faturamento",
            });
        } catch (error: any) {
            console.error("Erro ao atualizar base:", error);
        }
    };

    const handleArchiveClient = async () => {
        setIsArchiving(true);
        try {
            const { error } = await (supabase as any)
                .from('agency_clients')
                .update({ is_archived: true })
                .eq('id', clientId || client.id);

            if (error) throw error;

            toast({
                title: "Cliente arquivado",
                description: `${client.name} foi movido para os arquivos.`,
            });

            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['agency_clients'] });

            navigate('/clients');
        } catch (error: any) {
            console.error("Erro ao arquivar:", error);
            toast({
                variant: "destructive",
                title: "Erro ao arquivar",
                description: error.message || "Não foi possível arquivar o cliente.",
            });
        } finally {
            setIsArchiving(false);
        }
    };

    const handleDeleteClient = async () => {
        setIsDeleting(true);
        try {
            const { error } = await (supabase as any)
                .from('agency_clients')
                .delete()
                .eq('id', clientId || client.id);

            if (error) throw error;

            toast({
                title: "Cliente excluído",
                description: `${client.name} foi removido permanentemente.`,
            });

            queryClient.invalidateQueries({ queryKey: ['clients'] });
            queryClient.invalidateQueries({ queryKey: ['agency_clients'] });

            navigate('/clients');
        } catch (error: any) {
            console.error("Erro ao excluir:", error);
            toast({
                variant: "destructive",
                title: "Erro ao excluir",
                description: error.message || "Não foi possível excluir o cliente.",
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const calculationLabel = calculationBase === CALCULATION_BASE.SPEND
        ? "sobre o investimento"
        : "sobre o faturamento";

    return (
        <div className="w-full bg-card border border-border/50 rounded-lg shadow-none relative overflow-hidden">

            {/* Content */}
            <div className="relative z-10 p-6 lg:p-8">

                {/* Top Row: Identity + Status + Actions */}
                <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center mb-8">

                    {/* Identity */}
                    <div className="flex flex-col gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-fit h-auto p-0 hover:bg-transparent text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => navigate('/clients')}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar para clientes
                        </Button>
                        <div className="flex gap-4 items-center">
                            <EditableAvatar
                                clientId={clientId || client.id}
                                clientName={client.name}
                                currentLogoUrl={(client as any).logo_url}
                                primaryColor={client.primaryColor}
                                onAvatarChange={() => onClientUpdate?.()}
                            />
                            <div>
                                <InlineEditableName
                                    clientId={clientId || client.id}
                                    initialName={client.name}
                                    onNameChange={handleNameChange}
                                    className="mb-1"
                                />
                                <div className="flex flex-wrap items-center gap-3">
                                    <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-semibold bg-background/80 backdrop-blur-sm border-border/50">
                                        <Sparkles className="w-3 h-3 mr-1.5" />
                                        {client.serviceType === 'assessoria_completa' ? 'Assessoria Lever' : 'Consultoria'}
                                    </Badge>
                                    <Badge className={`${currentStatus.bgLight} ${currentStatus.text} border-0 text-[10px] font-semibold`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${currentStatus.color} mr-1.5 animate-pulse`} />
                                        {currentStatus.label}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        <ProductSelectorModal
                            clientId={clientId || client.id}
                            clientName={client.name}
                            onProductsAssigned={() => onClientUpdate?.()}
                        />

                        {/* Archive Button */}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-orange-500 border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-600">
                                    <Archive className="w-4 h-4 mr-2" />
                                    Arquivar
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Arquivar cliente?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        O cliente <strong>{client.name}</strong> será movido para os arquivos e não aparecerá mais na lista de clientes ativos.
                                        <br /><br />
                                        Você pode desarquivar a qualquer momento nas Configurações.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleArchiveClient}
                                        disabled={isArchiving}
                                        className="bg-orange-500 hover:bg-orange-600"
                                    >
                                        {isArchiving ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Arquivando...
                                            </>
                                        ) : (
                                            <>
                                                <Archive className="w-4 h-4 mr-2" />
                                                Arquivar
                                            </>
                                        )}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                        {/* Delete Button */}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-red-500 border-red-500/30 hover:bg-red-500/10 hover:text-red-600">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-red-500">Excluir cliente permanentemente?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta ação é irreversível. O cliente <strong>{client.name}</strong> e todos os dados associados serão apagados para sempre.
                                        <br /><br />
                                        Tem certeza que deseja continuar?
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={handleDeleteClient}
                                        disabled={isDeleting}
                                        className="bg-red-500 hover:bg-red-600"
                                    >
                                        {isDeleting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Excluindo...
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Confirmar Exclusão
                                            </>
                                        )}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>

                {/* Metrics Row with Inline Editing */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

                    {/* Fee Fixo Card - Editable */}
                    <div className="group relative bg-emerald-500/5 rounded-lg p-5 border border-emerald-500/20 hover:border-emerald-500/40 transition-all">
                        <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <DollarSign className="w-4 h-4 text-emerald-500" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600/80 mb-2 block">
                            Fee Fixo
                        </span>
                        <InlineEditableValue
                            clientId={clientId || client.id}
                            fieldName="fee_fixed"
                            initialValue={client.financials.fixedFee}
                            type="currency"
                            onValueChange={handleFeeChange}
                        />
                        <span className="text-xs text-muted-foreground mt-1 block">
                            cobrado mensalmente
                        </span>
                    </div>

                    {/* RevShare Card - Editable */}
                    <div className="group relative bg-primary/5 rounded-lg p-5 border border-primary/20 hover:border-primary/40 transition-all">
                        <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-primary/80 mb-2 block">
                            Comissão Performance
                        </span>
                        <InlineEditableValue
                            clientId={clientId || client.id}
                            fieldName="commission_rate"
                            initialValue={client.financials.variableFeePercentage}
                            type="percentage"
                            onValueChange={handleCommissionChange}
                        />
                        <span className="text-xs text-muted-foreground mt-1 block">
                            {calculationLabel}
                        </span>
                    </div>

                    {/* Contract Info Card */}
                    <div className="group relative bg-violet-500/5 rounded-lg p-5 border border-violet-500/20 hover:border-violet-500/40 transition-all">
                        <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                            <Calendar className="w-4 h-4 text-violet-500" />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-violet-600/80 mb-2 block">
                            Início do Contrato
                        </span>
                        <div className="text-2xl lg:text-3xl font-bold text-foreground mb-1">
                            {startDate}
                        </div>
                        <span className="text-xs text-muted-foreground">
                            {Math.floor((Date.now() - new Date(client.financials.contractStartDate).getTime()) / (1000 * 60 * 60 * 24))} dias de parceria
                        </span>
                    </div>
                </div>

                {/* Calculation Base Selector */}
                <div className="flex items-center gap-4 mb-6 p-4 bg-muted/30 rounded-lg border border-border/50">
                    <span className="text-sm font-medium text-muted-foreground">Base de Cálculo:</span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleCalculationBaseChange(CALCULATION_BASE.REVENUE)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                                calculationBase === CALCULATION_BASE.REVENUE
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-background border border-border hover:border-primary/50"
                            )}
                        >
                            📈 Faturamento
                        </button>
                        <button
                            onClick={() => handleCalculationBaseChange(CALCULATION_BASE.SPEND)}
                            className={cn(
                                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
                                calculationBase === CALCULATION_BASE.SPEND
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-background border border-border hover:border-primary/50"
                            )}
                        >
                            💰 Investimento
                        </button>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="relative">
                    <div className="flex justify-between items-center text-xs font-medium mb-3">
                        <span className="text-muted-foreground flex items-center gap-2">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            Progresso da Etapa Atual
                        </span>
                        <span className="text-primary font-bold text-sm">{client.progress}%</span>
                    </div>
                    <div className="h-2 bg-secondary/50 rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                                width: `${client.progress}%`,
                                backgroundColor: client.primaryColor
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
