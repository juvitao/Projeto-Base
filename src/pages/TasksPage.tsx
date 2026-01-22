import { TasksView } from "@/components/lever-os/TasksView";
import { ClipboardList } from "lucide-react";
import { useSelectedClient } from "@/contexts/SelectedClientContext";

export default function TasksPage() {
    const { selectedClientName, selectedClientId } = useSelectedClient();

    return (
        <div className="container mx-auto max-w-[1600px] pt-6 space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <ClipboardList className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {selectedClientId ? `Demandas: ${selectedClientName}` : "Central de Demandas"}
                    </h1>
                    <p className="text-muted-foreground">
                        {selectedClientId
                            ? "Tarefas filtradas pelo cliente selecionado no header"
                            : "Selecione um cliente no header para filtrar"}
                    </p>
                </div>
            </div>

            <div className="bg-card border border-border/50 rounded-lg p-6 shadow-none min-h-[calc(100vh-180px)]">
                {/* TasksView pega o clientId do contexto global automaticamente */}
                <TasksView />
            </div>
        </div>
    );
}
