import { useState, useEffect } from "react";
import { Search, Plus, User, Loader2, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ClientDetailModal } from "@/components/clients/ClientDetailModal";

interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
}

const Clients = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", phone: "", email: "", address: "" });
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("vora_clients")
      .select("*")
      .eq("status", "active")
      .order("name", { ascending: true });

    if (error) {
      toast({ title: "Erro ao buscar clientes", description: error.message, variant: "destructive" });
    } else {
      setClients(data || []);
    }
    setIsLoading(false);
  };

  const handleCreateClient = async () => {
    const { data, error } = await supabase
      .from("vora_clients")
      .insert([newClient])
      .select();

    if (error) {
      toast({ title: "Erro ao criar cliente", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cliente criado com sucesso!" });
      setIsDialogOpen(false);
      setNewClient({ name: "", phone: "", email: "", address: "" });
      fetchClients();
      if (data?.[0]) {
        setSelectedClientId(data[0].id);
      }
    }
  };

  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.phone.includes(searchQuery)
  );

  const isFormValid = newClient.name.trim() !== "" && newClient.phone.trim() !== "";

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase flex items-center gap-3">
            <User className="w-7 h-7 text-primary" /> Clientes
          </h1>
          <p className="text-muted-foreground text-sm">{clients.length} clientes cadastrados</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="font-bold uppercase text-xs h-11 px-6 gap-2">
              <Plus className="w-4 h-4" /> Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-black uppercase tracking-tight">Novo Cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Nome *</Label>
                <Input
                  placeholder="Nome completo"
                  className="h-10"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase">Telefone *</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  className="h-10"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase">Email</Label>
                  <Input
                    type="email"
                    placeholder="email@exemplo.com"
                    className="h-10"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase">Endereço</Label>
                  <Input
                    placeholder="Cidade/Estado"
                    className="h-10"
                    value={newClient.address}
                    onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateClient} disabled={!isFormValid}>Criar Cliente</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou telefone..."
          className="pl-9 h-11"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Client List */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs font-bold uppercase">Carregando clientes...</p>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="py-20 text-center border-2 border-dashed rounded-xl text-muted-foreground">
          <p className="font-bold">Nenhum cliente encontrado.</p>
          <p className="text-xs mt-1">Use &quot;Novo Cliente&quot; para cadastrar.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {filteredClients.map((client) => (
            <button
              key={client.id}
              className="w-full flex items-center gap-3 py-2.5 px-3 bg-card border rounded-lg hover:border-primary/40 transition-all text-left group"
              onClick={() => setSelectedClientId(client.id)}
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{client.name}</p>
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                <Phone className="w-3 h-3" />{client.phone}
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0">→</span>
            </button>
          ))}
        </div>
      )}

      {/* Client Detail Modal */}
      <ClientDetailModal
        clientId={selectedClientId}
        onClose={() => setSelectedClientId(null)}
      />
    </div>
  );
};

export default Clients;
