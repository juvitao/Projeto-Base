import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, Folder, Users, Plus, Loader2 } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelectedClient } from "@/contexts/SelectedClientContext";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";

// Generate a color based on client name
const generateColor = (name: string): string => {
  const colors = ['#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#8B5CF6', '#FF6B6B', '#4ECDC4', '#45B7D1'];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export function AdAccountSelector() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedClientId, selectedClientName, setSelectedClient, isLoading, clients } = useSelectedClient();
  const { toast } = useToast();

  const getSelectedLabel = () => {
    if (selectedClientId && selectedClientName) {
      return selectedClientName;
    }
    return "Padrão Geral";
  };

  const handleSelectClient = (clientId: string | null, clientName?: string) => {
    console.log('[AdAccountSelector] Selecting client:', clientId);

    // Fecha o dropdown primeiro
    setOpen(false);

    // Se é o mesmo cliente, não faz nada
    if (clientId === selectedClientId) {
      toast({
        description: `Você já está visualizando ${clientName || 'este cliente'}`,
      });
      return;
    }

    // Atualiza o contexto
    setSelectedClient(clientId);

    // Verifica se está na página de demandas/tasks
    const isOnTasksPage = location.pathname === '/tasks';

    // Navegar para o destino apropriado
    if (clientId) {
      console.log('[AdAccountSelector] Navigating, isOnTasksPage:', isOnTasksPage);

      // Toast de feedback
      toast({
        title: "Cliente alterado",
        description: `Visualizando: ${clientName}`,
      });

      if (isOnTasksPage) {
        // Se está na página de demandas, apenas atualiza o contexto (a página já filtra)
        console.log('[AdAccountSelector] Staying on tasks page, context updated');
      } else {
        // Se está em outra página, navega para o Hub do cliente
        window.location.href = `/clients/${clientId}`;
      }
    } else {
      // Se selecionou "Padrão Geral", vai para a visão geral
      toast({
        description: "Voltando para visão geral",
      });
      window.location.href = '/';
    }
  };

  // Find selected client from real client list
  const selectedClient = useMemo(() =>
    clients.find((c: any) => c.id === selectedClientId),
    [clients, selectedClientId]
  );

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[280px] justify-between h-10 border border-input shadow-sm bg-background hover:bg-accent hover:text-accent-foreground transition-all duration-200"
            disabled={isLoading}
          >
            <div className="flex items-center truncate">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : selectedClientId ? (
                <>
                  <div
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: selectedClient?.primaryColor || generateColor(selectedClientName || '') }}
                  />
                  <Folder className="mr-2 h-4 w-4 text-primary" />
                </>
              ) : (
                <Users className="mr-2 h-4 w-4 text-muted-foreground" />
              )}
              <span className="truncate">{isLoading ? "Carregando..." : getSelectedLabel()}</span>
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar cliente..." />
            <CommandList>
              <CommandEmpty>Nenhum cliente encontrado</CommandEmpty>

              {/* Padrão Geral (ver todos) */}
              <CommandGroup heading="Visão">
                <CommandItem
                  value="padrao-geral"
                  onSelect={() => handleSelectClient(null)}
                  className="cursor-pointer"
                >
                  <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                  Padrão Geral
                  {selectedClientId === null && (
                    <Check className="ml-auto h-4 w-4 text-primary" />
                  )}
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />

              {/* Lista de Clientes Reais do Supabase */}
              <CommandGroup heading="Clientes">
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : clients.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    Nenhum cliente cadastrado
                  </div>
                ) : (
                  clients.map((client: any) => (
                    <CommandItem
                      key={client.id}
                      value={`client-${client.name}`}
                      onSelect={() => handleSelectClient(client.id, client.name)}
                      className="cursor-pointer"
                    >
                      <div
                        className="mr-2 h-3 w-3 rounded-full"
                        style={{ backgroundColor: client.primaryColor || generateColor(client.name) }}
                      />
                      {client.name}
                      {selectedClientId === client.id && (
                        <Check className="ml-auto h-4 w-4 text-primary" />
                      )}
                    </CommandItem>
                  ))
                )}
              </CommandGroup>

              <CommandSeparator />

              {/* Ação para cadastrar novo cliente */}
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    navigate('/clients');
                  }}
                  className="cursor-pointer text-primary font-medium"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Gerenciar Portfólio
                </CommandItem>
              </CommandGroup>

            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
