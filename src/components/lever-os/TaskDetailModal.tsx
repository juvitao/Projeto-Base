import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
    Check,
    Plus,
    Trash2,
    Calendar,
    User,
    Flag,
    Clock,
    CheckCircle2,
    Circle,
    X,
    ExternalLink,
    FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task } from '@/types/lever-os';
import { useTasks } from '@/contexts/TasksContext';
import { MOCK_TEAM_MEMBERS } from '@/mocks/lever-os-data';

interface TaskDetailModalProps {
    task: Task | null;
    isOpen: boolean;
    onClose: () => void;
}

export function TaskDetailModal({ task: initialTask, isOpen, onClose }: TaskDetailModalProps) {
    const {
        toggleChecklistItem,
        addChecklistItem,
        removeChecklistItem,
        getTaskById,
    } = useTasks();

    const [newItemTitle, setNewItemTitle] = useState('');
    const [isAddingItem, setIsAddingItem] = useState(false);

    // Buscar task atualizada do context para ter dados em tempo real
    const task = initialTask ? getTaskById(initialTask.id) : null;

    if (!task) return null;

    const completedCount = task.checklist?.filter(item => item.isCompleted).length || 0;
    const totalCount = task.checklist?.length || 0;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const assignee = MOCK_TEAM_MEMBERS.find(m => m.id === task.assigneeId) || MOCK_TEAM_MEMBERS[0];

    const getStatusConfig = (status: Task['status']) => {
        const configs = {
            backlog: { label: 'Backlog', color: 'bg-slate-500', textColor: 'text-slate-500' },
            todo: { label: 'A Fazer', color: 'bg-slate-500', textColor: 'text-slate-500' },
            in_progress: { label: 'Em Andamento', color: 'bg-blue-500', textColor: 'text-blue-500' },
            validation: { label: 'Validacao', color: 'bg-purple-500', textColor: 'text-purple-500' },
            done: { label: 'Concluido', color: 'bg-green-500', textColor: 'text-green-500' },
        };
        return configs[status] || configs.todo;
    };

    const getPriorityConfig = (priority: Task['priority']) => {
        const configs = {
            low: { label: 'Baixa', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
            medium: { label: 'Media', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
            high: { label: 'Alta', color: 'bg-red-500/10 text-red-500 border-red-500/20' },
            critical: { label: 'Critica', color: 'bg-red-600/10 text-red-600 border-red-600/20' },
        };
        return configs[priority] || configs.medium;
    };

    const statusConfig = getStatusConfig(task.status);
    const priorityConfig = getPriorityConfig(task.priority);

    const handleAddItem = () => {
        if (newItemTitle.trim()) {
            addChecklistItem(task.id, newItemTitle.trim());
            setNewItemTitle('');
            setIsAddingItem(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleAddItem();
        } else if (e.key === 'Escape') {
            setIsAddingItem(false);
            setNewItemTitle('');
        }
    };

    const handleChecklistToggle = (itemId: string) => {
        toggleChecklistItem(task.id, itemId);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <div className={cn("w-2 h-2 rounded-full", statusConfig.color)} />
                                <span className={cn("text-xs font-medium", statusConfig.textColor)}>
                                    {statusConfig.label}
                                </span>
                                <Badge variant="outline" className={cn("text-[10px] h-5 px-1.5 border", priorityConfig.color)}>
                                    <Flag className="w-2.5 h-2.5 mr-1" />
                                    {priorityConfig.label}
                                </Badge>
                            </div>
                            <DialogTitle className="text-xl font-semibold">
                                {task.title}
                            </DialogTitle>
                        </div>
                    </div>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                    {/* Descricao */}
                    {task.description && (
                        <div className="text-sm text-muted-foreground">
                            {task.description}
                        </div>
                    )}

                    {/* Meta info */}
                    <div className="flex flex-wrap gap-4 text-sm">
                        {/* Responsavel */}
                        <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Responsavel:</span>
                            <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                    <AvatarImage src={assignee.avatarUrl} />
                                    <AvatarFallback className="text-[10px]">
                                        {assignee.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{assignee.name}</span>
                            </div>
                        </div>

                        {/* Data de criacao */}
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Criada em:</span>
                            <span className="font-medium">
                                {new Date(task.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                        </div>

                        {/* Due date */}
                        {task.dueDate && (
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-muted-foreground" />
                                <span className="text-muted-foreground">Prazo:</span>
                                <span className="font-medium">
                                    {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                                </span>
                            </div>
                        )}
                    </div>

                    <Separator />

                    {/* Progresso */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="font-medium flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" />
                                Processos
                            </h4>
                            <span className="text-sm text-muted-foreground">
                                {completedCount} de {totalCount} ({progressPercent}%)
                            </span>
                        </div>
                        <Progress
                            value={progressPercent}
                            className={cn(
                                "h-2",
                                progressPercent === 100 && "[&>div]:bg-green-500"
                            )}
                        />
                    </div>

                    {/* Checklist */}
                    <div className="space-y-2">
                        {task.checklist?.map((item) => (
                            <div
                                key={item.id}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg border transition-all group",
                                    item.isCompleted
                                        ? "bg-green-500/5 border-green-500/20"
                                        : "bg-muted/30 border-border/50 hover:border-border"
                                )}
                            >
                                <Checkbox
                                    id={item.id}
                                    checked={item.isCompleted}
                                    onCheckedChange={() => handleChecklistToggle(item.id)}
                                    className={cn(
                                        "h-5 w-5 rounded-full border-2 cursor-pointer",
                                        item.isCompleted && "bg-green-500 border-green-500 data-[state=checked]:bg-green-500"
                                    )}
                                />
                                <label
                                    htmlFor={item.id}
                                    className={cn(
                                        "flex-1 text-sm cursor-pointer select-none",
                                        item.isCompleted && "line-through text-muted-foreground"
                                    )}
                                >
                                    {item.title}
                                </label>

                                {/* Link de documentacao */}
                                {item.documentationUrl && (
                                    <a
                                        href={item.documentationUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 px-2 py-1 text-xs text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 rounded transition-colors"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <FileText className="w-3 h-3" />
                                        <span className="hidden sm:inline">Docs</span>
                                        <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                )}

                                {item.isCompleted && item.completedAt && (
                                    <span className="text-xs text-muted-foreground">
                                        {new Date(item.completedAt).toLocaleDateString('pt-BR')}
                                    </span>
                                )}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeChecklistItem(task.id, item.id)}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        ))}

                        {/* Adicionar novo item */}
                        {isAddingItem ? (
                            <div className="flex items-center gap-2 p-2">
                                <Circle className="w-5 h-5 text-muted-foreground" />
                                <Input
                                    autoFocus
                                    placeholder="Nome do processo..."
                                    value={newItemTitle}
                                    onChange={(e) => setNewItemTitle(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="h-8 flex-1"
                                />
                                <Button size="sm" variant="ghost" onClick={handleAddItem}>
                                    <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        setIsAddingItem(false);
                                        setNewItemTitle('');
                                    }}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setIsAddingItem(true)}
                                className="w-full p-3 border-2 border-dashed border-muted hover:border-primary/30 rounded-lg flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-all"
                            >
                                <Plus className="w-4 h-4" />
                                Adicionar processo
                            </button>
                        )}
                    </div>

                    {/* Mensagem de conclusao */}
                    {task.status === 'done' && (
                        <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                            <span className="text-sm text-green-600 font-medium">
                                {task.completedAt
                                    ? `Concluida em ${new Date(task.completedAt).toLocaleDateString('pt-BR', {
                                        day: '2-digit',
                                        month: 'long',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}`
                                    : 'Tarefa concluida!'
                                }
                            </span>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
