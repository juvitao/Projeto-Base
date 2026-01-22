import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CalendarIcon, Plus } from "lucide-react";
import { MOCK_TEAM_MEMBERS } from "@/mocks/lever-os-data";
import { useSelectedClient } from "@/contexts/SelectedClientContext";

interface NewTaskModalProps {
    trigger?: React.ReactNode;
    defaultPhase?: string; // Para pré-selecionar fase quando vem da Timeline
    onTaskCreated?: (task: any) => void;
}

const PRIORITY_OPTIONS = [
    { value: "low", label: "Baixa", color: "bg-green-500" },
    { value: "medium", label: "Média", color: "bg-orange-500" },
    { value: "high", label: "Alta", color: "bg-red-500" },
    { value: "critical", label: "Crítica", color: "bg-purple-500" },
];

const AREA_OPTIONS = [
    { value: "traffic", label: "Tráfego" },
    { value: "design", label: "Design" },
    { value: "copy", label: "Copy" },
    { value: "strategy", label: "Estratégia" },
    { value: "dev", label: "Desenvolvimento" },
];

export function NewTaskModal({ trigger, defaultPhase, onTaskCreated }: NewTaskModalProps) {
    const { selectedClientId, selectedClientName } = useSelectedClient();
    const [open, setOpen] = useState(false);

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [dueDate, setDueDate] = useState("");
    const [assigneeId, setAssigneeId] = useState("");
    const [priority, setPriority] = useState("medium");
    const [area, setArea] = useState("");

    const handleSubmit = () => {
        const newTask = {
            id: `t${Date.now()}`,
            clientId: selectedClientId,
            title,
            description,
            dueDate,
            assigneeId,
            priority,
            area,
            phase: defaultPhase,
            status: "todo",
            createdAt: new Date().toISOString(),
        };

        console.log("Nova tarefa criada:", newTask);
        onTaskCreated?.(newTask);

        // Reset form
        setTitle("");
        setDescription("");
        setDueDate("");
        setAssigneeId("");
        setPriority("medium");
        setArea("");
        setOpen(false);
    };

    const isFormValid = title.trim().length > 0 && selectedClientId;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Nova Tarefa
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        Nova Tarefa
                        {selectedClientName && (
                            <span className="text-sm font-normal text-muted-foreground">
                                • {selectedClientName}
                            </span>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Título */}
                    <div className="space-y-2">
                        <Label htmlFor="title">Título *</Label>
                        <Input
                            id="title"
                            placeholder="Ex: Configurar pixel do Meta"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />
                    </div>

                    {/* Descrição */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                            id="description"
                            placeholder="Detalhes da tarefa..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                        />
                    </div>

                    {/* Data + Prioridade (lado a lado) */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="dueDate">Data de Entrega</Label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="dueDate"
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Prioridade</Label>
                            <Select value={priority} onValueChange={setPriority}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PRIORITY_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${opt.color}`} />
                                                {opt.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Responsável */}
                    <div className="space-y-2">
                        <Label>Responsável</Label>
                        <Select value={assigneeId} onValueChange={setAssigneeId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecionar membro..." />
                            </SelectTrigger>
                            <SelectContent>
                                {MOCK_TEAM_MEMBERS.map(member => (
                                    <SelectItem key={member.id} value={member.id}>
                                        <div className="flex items-center gap-2">
                                            <Avatar className="h-5 w-5">
                                                <AvatarImage src={member.avatarUrl} />
                                                <AvatarFallback className="text-[8px]">
                                                    {member.name.split(' ').map(n => n[0]).join('')}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span>{member.name}</span>
                                            <span className="text-xs text-muted-foreground ml-auto">
                                                {member.role === 'head' ? 'Head' : member.role === 'media_buyer' ? 'Gestor' : 'Dev'}
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Área Responsável */}
                    <div className="space-y-2">
                        <Label>Área Responsável</Label>
                        <Select value={area} onValueChange={setArea}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecionar área..." />
                            </SelectTrigger>
                            <SelectContent>
                                {AREA_OPTIONS.map(opt => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Aviso se não tiver cliente */}
                    {!selectedClientId && (
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-md p-3 text-sm text-orange-600">
                            ⚠️ Selecione um cliente no header para vincular a tarefa.
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={!isFormValid}>
                        Criar Tarefa
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
