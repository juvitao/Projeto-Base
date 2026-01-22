import { useState, useEffect } from "react";
import { Task } from "@/types/lever-os";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, CalendarClock, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOCK_TEAM_MEMBERS } from "@/mocks/lever-os-data";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useSelectedClient } from "@/contexts/SelectedClientContext";
import { NewTaskModal } from "@/components/lever-os/NewTaskModal";
import { TaskDetailModal } from "@/components/lever-os/TaskDetailModal";
import { useTasks } from "@/contexts/TasksContext";
import { usePermissions } from "@/contexts/PermissionsContext";

interface TasksViewProps {
    clientId?: string | null;
    title?: string;
}

export function TasksView({ clientId: propClientId, title }: TasksViewProps) {
    const { selectedClientId, isLoading: clientLoading } = useSelectedClient();
    const activeClientId = propClientId !== undefined ? propClientId : selectedClientId;

    // Usar TasksContext
    const {
        tasks,
        isLoading: tasksLoading,
        moveTask,
        selectedTask,
        openTaskDetail,
        closeTaskDetail,
        updateTask
    } = useTasks();

    const [localTasks, setLocalTasks] = useState<Task[]>([]);
    const [draggedTask, setDraggedTask] = useState<Task | null>(null);

    const { canEdit } = usePermissions();
    const canEditDemands = canEdit('demands');

    const isLoading = clientLoading || tasksLoading;

    // Sincronizar tasks do context com filtro do cliente
    useEffect(() => {
        if (activeClientId) {
            setLocalTasks(tasks.filter(t => t.clientId === activeClientId));
        } else {
            setLocalTasks(tasks);
        }
    }, [activeClientId, tasks]);

    const columns = [
        { id: 'todo', title: 'A Fazer', color: 'bg-slate-500' },
        { id: 'in_progress', title: 'Em Andamento', color: 'bg-blue-500' },
        { id: 'validation', title: 'Validação', color: 'bg-purple-500' },
        { id: 'done', title: 'Concluído', color: 'bg-green-500' }
    ];

    const getPriorityColor = (priority: Task['priority']) => {
        switch (priority) {
            case 'critical': return "text-red-600 bg-red-600/10 border-red-600/20";
            case 'high': return "text-red-500 bg-red-500/10 border-red-500/20";
            case 'medium': return "text-orange-500 bg-orange-500/10 border-orange-500/20";
            case 'low': return "text-green-500 bg-green-500/10 border-green-500/20";
            default: return "text-muted-foreground bg-muted/10 border-muted/20";
        }
    };

    const handleDragStart = (e: React.DragEvent, task: Task) => {
        setDraggedTask(task);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetStatus: string) => {
        e.preventDefault();
        if (draggedTask && draggedTask.status !== targetStatus) {
            // Usar moveTask do context para sincronizar com timeline
            moveTask(draggedTask.id, targetStatus as Task['status']);
        }
        setDraggedTask(null);
    };

    const handleDragEnd = () => {
        setDraggedTask(null);
    };

    const getTaskAssignee = (task: Task) => {
        const index = parseInt(task.id.replace('t', '')) % 3;
        return MOCK_TEAM_MEMBERS[index] || MOCK_TEAM_MEMBERS[0];
    };

    const handleTaskCreated = (newTask: any) => {
        // Task sera adicionada via context
        // O useEffect ja sincroniza as tasks do context
    };

    // Handler para clicar em uma task e abrir o modal
    const handleTaskClick = (task: Task) => {
        openTaskDetail(task);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Carregando tarefas...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        {title || (activeClientId ? "Gestão de Tarefas" : "Central de Demandas")}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        {activeClientId
                            ? "Arraste os cards para mover entre colunas"
                            : "Selecione um cliente no header para filtrar"}
                    </p>
                </div>
                {canEditDemands && (
                    <NewTaskModal onTaskCreated={handleTaskCreated} />
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
                {columns.map((col) => {
                    const colTasks = localTasks.filter(t => t.status === col.id);

                    return (
                        <div
                            key={col.id}
                            className={cn(
                                "flex flex-col h-full rounded-lg bg-muted/20 border border-border/50 transition-all",
                                draggedTask && "border-dashed border-primary/50"
                            )}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, col.id)}
                        >
                            <div className="p-3 flex items-center justify-between border-b border-border/50 bg-muted/30 rounded-t-lg">
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-2 h-2 rounded-full", col.color)} />
                                    <span className="font-semibold text-sm">{col.title}</span>
                                    <span className="ml-1 text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded-full border border-border/50">
                                        {colTasks.length}
                                    </span>
                                </div>
                            </div>

                            <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[100px]">
                                {colTasks.map((task) => {
                                    const assignee = getTaskAssignee(task);
                                    const checklistProgress = task.checklist
                                        ? {
                                            completed: task.checklist.filter(c => c.isCompleted).length,
                                            total: task.checklist.length
                                        }
                                        : null;

                                    return (
                                        <div
                                            key={task.id}
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, task)}
                                            onDragEnd={handleDragEnd}
                                            onClick={() => handleTaskClick(task)}
                                            className={cn(
                                                "bg-card p-3 rounded-md border border-border/50 shadow-sm hover:border-primary/30 hover:shadow-md transition-all group cursor-pointer",
                                                draggedTask?.id === task.id && "opacity-50 ring-2 ring-primary",
                                                task.stepId && "border-l-2 border-l-primary/50" // Indicador visual de task vinculada a timeline
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <h4 className="text-sm font-medium leading-snug line-clamp-2">
                                                    {task.title}
                                                </h4>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-5 w-5 opacity-0 group-hover:opacity-100 -mr-2 -mt-1 shrink-0"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
                                                </Button>
                                            </div>

                                            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                                                {task.description}
                                            </p>

                                            {/* Progresso do checklist */}
                                            {checklistProgress && checklistProgress.total > 0 && (
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className={cn(
                                                                "h-full rounded-full transition-all",
                                                                checklistProgress.completed === checklistProgress.total
                                                                    ? "bg-green-500"
                                                                    : "bg-blue-500"
                                                            )}
                                                            style={{ width: `${(checklistProgress.completed / checklistProgress.total) * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        {checklistProgress.completed}/{checklistProgress.total}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between border-t border-border/50 pt-2 mt-auto">
                                                <div className="flex items-center gap-2">
                                                    {task.dueDate && (
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <CalendarClock className="w-3 h-3" />
                                                            <span>{new Date(task.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                                                        </div>
                                                    )}
                                                    <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 border capitalize font-medium", getPriorityColor(task.priority))}>
                                                        {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : task.priority === 'critical' ? 'Critica' : 'Baixa'}
                                                    </Badge>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground max-w-[80px] truncate">
                                                        {assignee.name.split(' ')[0]}
                                                    </span>
                                                    <Avatar className="h-6 w-6 border border-border">
                                                        <AvatarImage src={assignee.avatarUrl} alt={assignee.name} />
                                                        <AvatarFallback className="text-[10px]">
                                                            {assignee.name.substring(0, 2).toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {colTasks.length === 0 && (
                                    <div className={cn(
                                        "h-full flex items-center justify-center border-2 border-dashed border-muted rounded-md p-4 bg-muted/5 opacity-50 transition-all",
                                        draggedTask && "border-primary/50 bg-primary/5 opacity-100"
                                    )}>
                                        <span className="text-xs text-muted-foreground">
                                            {draggedTask ? "Solte aqui" : "Vazio"}
                                        </span>
                                    </div>
                                )}
                            </div>
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
