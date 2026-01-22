import { OnboardingPhase, ProcessStep } from "@/types/lever-os";
import { Check, Lock, Loader2, AlertCircle, Pencil, Plus, CheckCircle2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MOCK_TEAM_MEMBERS } from "@/mocks/lever-os-data";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { NewTaskModal } from "@/components/lever-os/NewTaskModal";
import { TaskDetailModal } from "@/components/lever-os/TaskDetailModal";
import { useTasks } from "@/contexts/TasksContext";
import { useSelectedClient } from "@/contexts/SelectedClientContext";

interface OnboardingTimelineProps {
    phases: OnboardingPhase[];
    completedConnections?: {
        meta: boolean;
        shopify: boolean;
        kartpanda: boolean;
    };
}

// Helper para pegar avatar baseado no role
const getAvatarByRole = (role: string) => {
    const roleMap: Record<string, string> = {
        'head': 'tm1',
        'media_buyer': 'tm2',
        'dev': 'tm3',
        'designer': 'tm3',
    };
    return MOCK_TEAM_MEMBERS.find(m => m.id === roleMap[role]) || MOCK_TEAM_MEMBERS[0];
};

// Steps que são auto-completados por conexões
const CONNECTION_STEP_MAP: Record<string, 'meta' | 'shopify' | 'kartpanda'> = {
    'step_2_1': 'meta',    // Solicitar acesso está ligado ao Meta
    'step_2_2': 'meta',    // Configurar Pixel também
};

export function OnboardingTimeline({ phases: initialPhases, completedConnections }: OnboardingTimelineProps) {
    const [phases, setPhases] = useState(initialPhases);
    const activePhaseIndex = phases.findIndex(p => p.steps.some(s => s.status === 'in_progress') || !p.isLocked);
    const [openPahses, setOpenPhases] = useState<number[]>([activePhaseIndex !== -1 ? activePhaseIndex : 0]);
    const [editingPhaseId, setEditingPhaseId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");

    // Integracao com TasksContext
    const { selectedClientId } = useSelectedClient();
    const {
        createTaskFromStep,
        getTaskByStepId,
        setOnTaskStatusChange,
        selectedTask,
        openTaskDetail,
        closeTaskDetail,
        moveTask
    } = useTasks();

    // Callback para sincronizar mudancas de status da task para o step
    const handleTaskStatusChange = useCallback((taskId: string, newStatus: string, stepId?: string) => {
        if (!stepId) return;

        // Mapear status da task para status do step
        const statusMap: Record<string, ProcessStep['status']> = {
            'backlog': 'blocked',
            'todo': 'pending',
            'in_progress': 'in_progress',
            'validation': 'in_progress',
            'done': 'completed',
        };

        const newStepStatus = statusMap[newStatus] || 'pending';

        setPhases(prev => prev.map(phase => ({
            ...phase,
            steps: phase.steps.map(step =>
                step.id === stepId
                    ? {
                        ...step,
                        status: newStepStatus,
                        completedAt: newStatus === 'done' ? new Date().toISOString() : undefined
                    }
                    : step
            )
        })));
    }, []);

    // Registrar callback de sincronizacao
    useEffect(() => {
        setOnTaskStatusChange(handleTaskStatusChange);
    }, [setOnTaskStatusChange, handleTaskStatusChange]);

    // Handler para clicar em um step - abre modal de tarefa
    const handleStepClick = (phase: OnboardingPhase, step: ProcessStep) => {
        if (!selectedClientId || phase.isLocked) return;

        // Buscar task existente ou criar nova
        let task = getTaskByStepId(step.id);
        if (!task) {
            task = createTaskFromStep(selectedClientId, phase.id, step);
        }

        openTaskDetail(task);
    };

    // Handler para iniciar uma tarefa
    const handleStartStep = (e: React.MouseEvent, phase: OnboardingPhase, step: ProcessStep) => {
        e.stopPropagation();
        if (!selectedClientId) return;

        // Criar ou obter task
        let task = getTaskByStepId(step.id);
        if (!task) {
            task = createTaskFromStep(selectedClientId, phase.id, step);
        }

        // Mover task para in_progress no context (isso vai disparar a sincronizacao)
        moveTask(task.id, 'in_progress');

        // Atualizar status local para in_progress
        setPhases(prev => prev.map(p => ({
            ...p,
            steps: p.steps.map(s =>
                s.id === step.id ? { ...s, status: 'in_progress' as const } : s
            )
        })));

        // Abrir modal da tarefa
        openTaskDetail(task);
    };

    // Handler para concluir uma tarefa
    const handleCompleteStep = (e: React.MouseEvent, phase: OnboardingPhase, step: ProcessStep) => {
        e.stopPropagation();

        // Mover task para done no context se existir
        const task = getTaskByStepId(step.id);
        if (task) {
            moveTask(task.id, 'done');
        }

        // Atualizar status local
        setPhases(prev => prev.map(p => ({
            ...p,
            steps: p.steps.map(s =>
                s.id === step.id
                    ? { ...s, status: 'completed' as const, completedAt: new Date().toISOString() }
                    : s
            )
        })));
    };

    const togglePhase = (index: number) => {
        if (openPahses.includes(index)) {
            setOpenPhases(openPahses.filter(i => i !== index));
        } else {
            setOpenPhases([...openPahses, index]);
        }
    };

    const startEditingTitle = (phase: OnboardingPhase, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingPhaseId(phase.id);
        setEditValue(phase.title);
    };

    const saveTitle = (phaseId: string) => {
        setPhases(prev => prev.map(p =>
            p.id === phaseId ? { ...p, title: editValue } : p
        ));
        setEditingPhaseId(null);
    };

    const getStatusIcon = (status: ProcessStep['status']) => {
        switch (status) {
            case 'completed': return <Check className="w-4 h-4 text-green-500" />;
            case 'in_progress': return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
            case 'blocked': return <AlertCircle className="w-4 h-4 text-red-500" />;
            default: return <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />;
        }
    };

    const getRoleBadge = (role: ProcessStep['assigneeRole']) => {
        const roles = {
            head: { label: "Head", color: "bg-purple-500/10 text-purple-500" },
            media_buyer: { label: "Gestor", color: "bg-blue-500/10 text-blue-500" },
            dev: { label: "Dev", color: "bg-orange-500/10 text-orange-500" },
            designer: { label: "Designer", color: "bg-pink-500/10 text-pink-500" },
        };
        const r = roles[role] || { label: role, color: "bg-gray-500/10 text-gray-500" };
        const member = getAvatarByRole(role);

        return (
            <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{member.name.split(' ')[0]}</span>
                <Avatar className="h-6 w-6 border border-border">
                    <AvatarImage src={member.avatarUrl} alt={member.name} />
                    <AvatarFallback className="text-[10px]">{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
            </div>
        );
    };

    return (
        <div className="relative space-y-8">
            <div className="grid gap-6">
                {phases.map((phase, index) => {
                    const isCompleted = phase.steps.every(s => s.status === 'completed');
                    const isInProgress = phase.steps.some(s => s.status === 'in_progress');
                    const isLocked = phase.isLocked;
                    const isEditing = editingPhaseId === phase.id;

                    return (
                        <div key={phase.id} className={cn("group relative pl-8 border-l-2 transition-all", isCompleted ? "border-green-500/50" : isInProgress ? "border-blue-500" : "border-muted")}>
                            {/* Marcador da Fase na Linha */}
                            <div className={cn(
                                "absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 bg-background flex items-center justify-center transition-all",
                                isCompleted ? "border-green-500 text-green-500" :
                                    isInProgress ? "border-blue-500" :
                                        "border-muted bg-muted"
                            )}>
                                {isCompleted && <Check className="w-2.5 h-2.5" />}
                                {isLocked && <Lock className="w-2.5 h-2.5 text-muted-foreground" />}
                            </div>

                            <Collapsible
                                open={openPahses.includes(index)}
                                onOpenChange={() => !isLocked && togglePhase(index)}
                                className={cn("bg-card border rounded-lg overflow-hidden transition-all", isInProgress ? "border-blue-500/30" : "border-border/50")}
                            >
                                <CollapsibleTrigger className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors cursor-pointer disabled:cursor-not-allowed" disabled={isLocked}>
                                    <div className="flex flex-col items-start gap-1">
                                        {/* Título Editável */}
                                        <div className="flex items-center gap-2">
                                            {isEditing ? (
                                                <Input
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={() => saveTitle(phase.id)}
                                                    onKeyDown={(e) => e.key === 'Enter' && saveTitle(phase.id)}
                                                    className="h-7 w-64 text-base font-semibold"
                                                    autoFocus
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            ) : (
                                                <>
                                                    <h3 className={cn("font-semibold text-base", isLocked ? "text-muted-foreground" : "text-foreground")}>
                                                        {index + 1}. {phase.title}
                                                    </h3>
                                                    {!isLocked && (
                                                        <button
                                                            onClick={(e) => startEditingTitle(phase, e)}
                                                            className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>{phase.steps.filter(s => s.status === 'completed').length}/{phase.steps.length} Steps</span>
                                            {isInProgress && <span className="text-blue-500 font-medium">• Em Andamento</span>}
                                        </div>
                                    </div>
                                    {isLocked ? <Lock className="w-4 h-4 text-muted-foreground" /> : (
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                            {openPahses.includes(index) ? "−" : "+"}
                                        </Button>
                                    )}
                                </CollapsibleTrigger>

                                <CollapsibleContent>
                                    <div className="p-4 pt-0 space-y-2">
                                        {phase.steps.map((step) => {
                                            const linkedTask = getTaskByStepId(step.id);
                                            const checklistProgress = linkedTask?.checklist
                                                ? `${linkedTask.checklist.filter(c => c.isCompleted).length}/${linkedTask.checklist.length}`
                                                : null;

                                            return (
                                                <div
                                                    key={step.id}
                                                    onClick={() => handleStepClick(phase, step)}
                                                    className={cn(
                                                        "flex items-center justify-between p-3 rounded-md transition-all cursor-pointer group",
                                                        step.status === 'completed' ? "bg-green-500/5 border border-green-500/10 hover:bg-green-500/10" :
                                                            step.status === 'in_progress' ? "bg-background border border-blue-500/20 hover:border-blue-500/40" :
                                                                "bg-muted/30 border border-transparent hover:bg-muted/50 hover:border-muted",
                                                        phase.isLocked && "cursor-not-allowed opacity-60"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn("flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-background border", step.status === 'completed' ? "border-green-500/30 text-green-500" : "border-muted")}>
                                                            {getStatusIcon(step.status)}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className={cn("text-sm font-medium", step.status === 'completed' ? "text-muted-foreground line-through" : "text-foreground")}>
                                                                {step.title}
                                                            </span>
                                                            {step.description && (
                                                                <span className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
                                                                    <AlertCircle className="w-3 h-3" /> {step.description}
                                                                </span>
                                                            )}
                                                            {/* Mostrar progresso do checklist se houver task vinculada */}
                                                            {checklistProgress && step.status !== 'completed' && (
                                                                <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                                    <CheckCircle2 className="w-3 h-3" /> {checklistProgress} processos
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        {getRoleBadge(step.assigneeRole)}

                                                        {step.status === 'in_progress' && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 text-xs border-blue-500/30 text-blue-500 hover:bg-blue-500/10 hover:text-blue-600"
                                                                onClick={(e) => handleCompleteStep(e, phase, step)}
                                                            >
                                                                Concluir
                                                            </Button>
                                                        )}
                                                        {step.status === 'pending' && !phase.isLocked && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-7 text-xs text-muted-foreground hover:bg-muted"
                                                                onClick={(e) => handleStartStep(e, phase, step)}
                                                            >
                                                                Iniciar
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Botão de Nova Tarefa no final da fase */}
                                        {!phase.isLocked && (
                                            <NewTaskModal
                                                defaultPhase={phase.id}
                                                trigger={
                                                    <button className="w-full mt-3 p-2 border-2 border-dashed border-muted hover:border-primary/50 rounded-md flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-all">
                                                        <Plus className="w-4 h-4" />
                                                        Adicionar tarefa nesta fase
                                                    </button>
                                                }
                                            />
                                        )}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        </div>
                    );
                })}
            </div>

            {/* Modal de detalhes da tarefa */}
            <TaskDetailModal
                task={selectedTask}
                isOpen={!!selectedTask}
                onClose={closeTaskDetail}
            />
        </div>
    );
}
