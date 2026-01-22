import { useNavigate } from "react-router-dom";
import { useSelectedClient } from "@/contexts/SelectedClientContext";
import { ArrowRight, Users, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { NewClientModal } from "@/components/clients/NewClientModal";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Generate a color based on client name
const generateColor = (name: string) => {
  const colors = ['#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#8B5CF6'];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

const Clients = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setSelectedClient, selectedClientId } = useSelectedClient();

  // Fetch real clients from Supabase
  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('agency_clients')
        .select('id, name, fee_fixed, commission_rate, calculation_base, created_at, is_archived')
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    }
  });

  const handleSelectClient = (clientId: string, clientName: string) => {
    setSelectedClient(clientId);
    navigate(`/clients/${clientId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-destructive">
        Erro ao carregar clientes: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl pt-8 space-y-8">

      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">{t('clients.select_project', 'Selecione um Projeto')}</h1>
        <p className="text-muted-foreground">
          {t('clients.choose_client_desc', 'Escolha um cliente para acessar o Hub de Projeto completo')}
        </p>
      </div>

      {/* Grid de Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client: any) => {
          const color = generateColor(client.name);
          return (
            <button
              key={client.id}
              onClick={() => handleSelectClient(client.id, client.name)}
              className={cn(
                "group relative p-6 bg-card border rounded-xl text-left transition-all duration-200",
                "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1",
                selectedClientId === client.id && "border-primary ring-2 ring-primary/20"
              )}
            >
              {/* Color Accent */}
              <div
                className="absolute top-0 left-0 w-full h-1 rounded-t-xl"
                style={{ backgroundColor: color }}
              />

              {/* Avatar */}
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold text-white mb-4"
                style={{ backgroundColor: color }}
              >
                {client.name.substring(0, 2).toUpperCase()}
              </div>

              {/* Info */}
              <h3 className="font-semibold text-lg mb-1">{client.name}</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {client.fee_fixed
                  ? `Fee: R$ ${Number(client.fee_fixed).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  : t('clients.no_accounts', 'Nenhuma conta vinculada')
                }
              </p>

              {/* Arrow Icon */}
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowRight className="w-5 h-5 text-primary" />
              </div>
            </button>
          );
        })}

        {/* Card de Novo Cliente */}
        <NewClientModal trigger={
          <button
            className="w-full group p-6 bg-muted/30 border-2 border-dashed rounded-xl text-center transition-all duration-200 hover:border-primary/50 hover:bg-muted/50"
          >
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-4">
              <Plus className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-muted-foreground">{t('clients.new_client', 'Novo Cliente')}</h3>
          </button>
        } />
      </div>

      {/* Dica */}
      <div className="text-center text-sm text-muted-foreground pt-4 border-t">
        <Users className="w-4 h-4 inline-block mr-1" />
        {t('clients.selector_tip', 'Você também pode trocar de cliente usando o seletor no header')}
      </div>
    </div>
  );
};

export default Clients;
