import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { ClientHeader } from "@/components/lever-os/ClientHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListTodo, ShieldCheck, Loader2, FolderOpen, Link2, AlertCircle, ArrowLeft, Package } from "lucide-react";
import { AccessVault } from "@/components/lever-os/AccessVault";
import { OnboardingTimeline } from "@/components/lever-os/OnboardingTimeline";
import { ConnectionsHub } from "@/components/lever-os/ConnectionsHub";
import { useSelectedClient } from "@/contexts/SelectedClientContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Client, OnboardingPhase, ClientStatus, ServiceType } from "@/types/lever-os";
import { AssignedProductsDisplay, convertProductsToPhases } from "@/components/clients/AssignedProducts";

// Generate a color based on client name
const generateColor = (name: string): string => {
    const colors = ['#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#8B5CF6', '#FF6B6B', '#4ECDC4', '#45B7D1'];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
};

export default function ClientDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { setSelectedClient, clientData, isLoading, error } = useSelectedClient();

    // Estado para rastrear conexões feitas
    const [connections, setConnections] = useState<{
        meta: boolean;
        shopify: boolean;
        kartpanda: boolean;
    }>({ meta: false, shopify: false, kartpanda: false });

    // Sincronizar o contexto global quando a página carregar com ID da URL
    useEffect(() => {
        if (id) {
            console.log('[ClientDetails] Setting selected client from URL:', id);
            setSelectedClient(id);
        }
    }, [id, setSelectedClient]);

    const handleConnectionChange = (type: 'meta' | 'shopify' | 'kartpanda', connected: boolean) => {
        setConnections(prev => ({ ...prev, [type]: connected }));
    };

    // Gerar fases baseadas nos produtos atribuídos
    const productBasedPhases = useMemo(() => {
        const assignedProducts = (clientData as any)?.assigned_products || [];
        return convertProductsToPhases(assignedProducts);
    }, [clientData]);

    // Adaptar dados do Supabase para o formato esperado pelo ClientHeader
    const adaptedClient: Client | null = useMemo(() => {
        if (!clientData) return null;

        return {
            id: clientData.id,
            name: clientData.name,
            primaryColor: clientData.primaryColor || generateColor(clientData.name),
            status: "onboarding" as ClientStatus,
            serviceType: "assessoria_completa" as ServiceType,
            progress: 0,
            financials: {
                fixedFee: clientData.fee_fixed || 0,
                variableFeePercentage: clientData.commission_rate || 0,
                currency: "BRL",
                contractStartDate: clientData.created_at || new Date().toISOString()
            },
            credentials: [],
            onboardingPhases: productBasedPhases.length > 0 ? productBasedPhases : []
        };
    }, [clientData, productBasedPhases]);

    // Mostra loading enquanto carrega dados do cliente
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-primary" />
                    <span className="text-muted-foreground">Carregando projeto...</span>
                </div>
            </div>
        );
    }

    // Mostra erro se houver
    if (error) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <div className="flex flex-col items-center gap-3 text-destructive">
                    <AlertCircle className="w-10 h-10" />
                    <span>Erro ao carregar: {error.message}</span>
                    <Button variant="outline" onClick={() => navigate('/clients')}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar para Clientes
                    </Button>
                </div>
            </div>
        );
    }

    // Cliente não encontrado
    if (!adaptedClient) {
        return (
            <div className="container mx-auto max-w-2xl pt-16">
                <Card className="border-dashed">
                    <CardHeader className="text-center">
                        <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <CardTitle>Cliente não encontrado</CardTitle>
                        <CardDescription>
                            O cliente com ID "{id}" não existe ou foi removido.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Button onClick={() => navigate('/clients')}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar para lista de clientes
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const assignedProductIds = (clientData as any)?.assigned_products || [];

    return (
        <div className="container mx-auto max-w-7xl pt-6 space-y-8">
            {/* Header Estratégico com Edição Inline */}
            <ClientHeader
                client={adaptedClient}
                clientId={clientData!.id}
                onClientUpdate={() => setSelectedClient(id!)}
            />

            {/* Produtos Atribuídos */}
            <AssignedProductsDisplay assignedProductIds={assignedProductIds} />

            {/* Navegação Interna do Hub */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-8">
                    <TabsTrigger value="overview" className="gap-2">
                        <ListTodo className="w-4 h-4" />
                        Demandas
                    </TabsTrigger>
                    <TabsTrigger value="connections" className="gap-2">
                        <Link2 className="w-4 h-4" />
                        Conexões
                    </TabsTrigger>
                    <TabsTrigger value="access" className="gap-2">
                        <ShieldCheck className="w-4 h-4" />
                        Vault
                    </TabsTrigger>
                    <TabsTrigger value="files" disabled className="gap-2 opacity-50">
                        <FolderOpen className="w-4 h-4" />
                        Arquivos
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-6 space-y-6">
                    {productBasedPhases.length > 0 ? (
                        <OnboardingTimeline
                            phases={productBasedPhases}
                            completedConnections={connections}
                        />
                    ) : (
                        <Card className="border-dashed">
                            <CardHeader className="text-center">
                                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                <CardTitle>Nenhuma demanda</CardTitle>
                                <CardDescription>
                                    Atribua produtos a este cliente para criar demandas automaticamente.
                                    Use o botão "Atribuir Produtos" no cabeçalho.
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="connections" className="mt-6">
                    <ConnectionsHub onConnectionChange={handleConnectionChange} />
                </TabsContent>

                <TabsContent value="access" className="mt-6">
                    <AccessVault credentials={adaptedClient.credentials} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
