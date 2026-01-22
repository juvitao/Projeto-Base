import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { Task, ChecklistItem, ProcessStep, OnboardingPhase } from '@/types/lever-os';
import { MOCK_TASKS } from '@/mocks/lever-os-data';
import { supabase } from '@/integrations/supabase/client';
import { PRODUCTS } from '@/config/products.config';

// Templates de checklist padrão para cada tipo de step da timeline
// Cada item pode ter um link de documentacao no Notion
const STEP_TEMPLATES: Record<string, { title: string; documentationUrl?: string }[]> = {
    'Call de Kick-off': [
        { title: 'Agendar horário com o cliente', documentationUrl: 'https://www.notion.so/lever/call-kickoff-agendamento' },
        { title: 'Preparar pauta da reunião', documentationUrl: 'https://www.notion.so/lever/call-kickoff-pauta' },
        { title: 'Realizar a call', documentationUrl: 'https://www.notion.so/lever/call-kickoff-execucao' },
        { title: 'Enviar resumo e próximos passos', documentationUrl: 'https://www.notion.so/lever/call-kickoff-resumo' },
    ],
    'Definição de Personas': [
        { title: 'Coletar informações do público-alvo', documentationUrl: 'https://www.notion.so/lever/personas-coleta' },
        { title: 'Criar documento de personas', documentationUrl: 'https://www.notion.so/lever/personas-documento' },
        { title: 'Validar com o cliente', documentationUrl: 'https://www.notion.so/lever/personas-validacao' },
    ],
    'Aprovação do Plano de Mídia': [
        { title: 'Montar plano de mídia', documentationUrl: 'https://www.notion.so/lever/plano-midia-criacao' },
        { title: 'Definir orçamento por canal', documentationUrl: 'https://www.notion.so/lever/plano-midia-orcamento' },
        { title: 'Enviar para aprovação do cliente', documentationUrl: 'https://www.notion.so/lever/plano-midia-aprovacao' },
        { title: 'Receber feedback e ajustar', documentationUrl: 'https://www.notion.so/lever/plano-midia-ajustes' },
    ],
    'Solicitar acesso Shopify': [
        { title: 'Enviar e-mail solicitando acesso de colaborador', documentationUrl: 'https://www.notion.so/lever/shopify-acesso-email' },
        { title: 'Aguardar convite', documentationUrl: 'https://www.notion.so/lever/shopify-acesso-convite' },
        { title: 'Aceitar convite e testar acesso', documentationUrl: 'https://www.notion.so/lever/shopify-acesso-teste' },
    ],
    'Criar BM e Pixel': [
        { title: 'Criar Business Manager no Meta', documentationUrl: 'https://www.notion.so/lever/meta-bm-criacao' },
        { title: 'Criar Pixel do Facebook', documentationUrl: 'https://www.notion.so/lever/meta-pixel-criacao' },
        { title: 'Instalar pixel no site', documentationUrl: 'https://www.notion.so/lever/meta-pixel-instalacao' },
        { title: 'Configurar eventos padrão', documentationUrl: 'https://www.notion.so/lever/meta-pixel-eventos' },
        { title: 'Testar eventos com Extension', documentationUrl: 'https://www.notion.so/lever/meta-pixel-teste' },
    ],
    'Verificar acesso Google Drive': [
        { title: 'Solicitar acesso à pasta compartilhada', documentationUrl: 'https://www.notion.so/lever/drive-acesso-solicitacao' },
        { title: 'Verificar permissões de edição', documentationUrl: 'https://www.notion.so/lever/drive-permissoes' },
        { title: 'Organizar estrutura de pastas', documentationUrl: 'https://www.notion.so/lever/drive-estrutura' },
    ],
    'Upload do Tema Premium': [
        { title: 'Baixar tema do fornecedor', documentationUrl: 'https://www.notion.so/lever/tema-download' },
        { title: 'Fazer backup do tema atual', documentationUrl: 'https://www.notion.so/lever/tema-backup' },
        { title: 'Fazer upload do novo tema', documentationUrl: 'https://www.notion.so/lever/tema-upload' },
        { title: 'Ativar e testar tema', documentationUrl: 'https://www.notion.so/lever/tema-ativacao' },
    ],
    'Importação de Produtos': [
        { title: 'Solicitar planilha de produtos', documentationUrl: 'https://www.notion.so/lever/produtos-planilha' },
        { title: 'Formatar CSV para Shopify', documentationUrl: 'https://www.notion.so/lever/produtos-csv' },
        { title: 'Importar produtos', documentationUrl: 'https://www.notion.so/lever/produtos-importacao' },
        { title: 'Revisar produtos importados', documentationUrl: 'https://www.notion.so/lever/produtos-revisao' },
        { title: 'Ajustar imagens e descrições', documentationUrl: 'https://www.notion.so/lever/produtos-ajustes' },
    ],
    'Configuração Checkout': [
        { title: 'Configurar métodos de pagamento', documentationUrl: 'https://www.notion.so/lever/checkout-pagamento' },
        { title: 'Configurar métodos de envio', documentationUrl: 'https://www.notion.so/lever/checkout-envio' },
        { title: 'Testar fluxo de compra completo', documentationUrl: 'https://www.notion.so/lever/checkout-teste' },
    ],
    'Conexão de Domínio': [
        { title: 'Verificar propriedade do domínio', documentationUrl: 'https://www.notion.so/lever/dominio-propriedade' },
        { title: 'Configurar DNS (CNAME/A Record)', documentationUrl: 'https://www.notion.so/lever/dominio-dns' },
        { title: 'Aguardar propagação', documentationUrl: 'https://www.notion.so/lever/dominio-propagacao' },
        { title: 'Instalar certificado SSL', documentationUrl: 'https://www.notion.so/lever/dominio-ssl' },
        { title: 'Testar domínio funcionando', documentationUrl: 'https://www.notion.so/lever/dominio-teste' },
    ],
    'Configurar Reportana (WhatsApp)': [
        { title: 'Criar conta no Reportana', documentationUrl: 'https://www.notion.so/lever/reportana-conta' },
        { title: 'Conectar WhatsApp Business', documentationUrl: 'https://www.notion.so/lever/reportana-whatsapp' },
        { title: 'Configurar automações', documentationUrl: 'https://www.notion.so/lever/reportana-automacoes' },
        { title: 'Testar fluxos de mensagem', documentationUrl: 'https://www.notion.so/lever/reportana-teste' },
    ],
    'Validar Eventos (GTM/Pixel)': [
        { title: 'Verificar GTM instalado', documentationUrl: 'https://www.notion.so/lever/gtm-verificacao' },
        { title: 'Testar evento de PageView', documentationUrl: 'https://www.notion.so/lever/gtm-pageview' },
        { title: 'Testar evento de AddToCart', documentationUrl: 'https://www.notion.so/lever/gtm-addtocart' },
        { title: 'Testar evento de Purchase', documentationUrl: 'https://www.notion.so/lever/gtm-purchase' },
        { title: 'Validar no Events Manager', documentationUrl: 'https://www.notion.so/lever/gtm-events-manager' },
    ],
};

// Gerar checklist padrão baseado no título do step
function generateDefaultChecklist(stepTitle: string): ChecklistItem[] {
    const template = STEP_TEMPLATES[stepTitle] || [
        { title: 'Iniciar tarefa' },
        { title: 'Executar processo' },
        { title: 'Validar resultado' },
        { title: 'Finalizar e documentar' },
    ];

    return template.map((item, index) => ({
        id: `cl_${Date.now()}_${index}`,
        title: item.title,
        isCompleted: false,
        documentationUrl: item.documentationUrl,
    }));
}

// Mapear status do ProcessStep para Task
function mapStepStatusToTaskStatus(stepStatus: ProcessStep['status']): Task['status'] {
    const map: Record<ProcessStep['status'], Task['status']> = {
        'pending': 'todo',
        'in_progress': 'in_progress',
        'completed': 'done',
        'blocked': 'backlog',
    };
    return map[stepStatus];
}

// Mapear status da Task para ProcessStep
function mapTaskStatusToStepStatus(taskStatus: Task['status']): ProcessStep['status'] {
    const map: Record<Task['status'], ProcessStep['status']> = {
        'backlog': 'blocked',
        'todo': 'pending',
        'in_progress': 'in_progress',
        'validation': 'in_progress',
        'done': 'completed',
    };
    return map[taskStatus];
}

// Mapear role para area
function mapRoleToArea(role: ProcessStep['assigneeRole']): Task['area'] {
    const map: Record<ProcessStep['assigneeRole'], Task['area']> = {
        'head': 'strategy',
        'media_buyer': 'traffic',
        'dev': 'dev',
        'designer': 'design',
    };
    return map[role];
}

// Gerar tasks a partir dos produtos atribuídos a um cliente
function generateTasksFromProducts(
    clientId: string,
    clientName: string,
    assignedProductIds: string[]
): Task[] {
    const assignedProducts = PRODUCTS.filter(p => assignedProductIds.includes(p.id));

    return assignedProducts.flatMap((product, pIndex) =>
        product.features.map((feature, fIndex) => ({
            id: `task_${clientId}_${product.id}_${fIndex}`,
            clientId,
            phaseId: `product-${product.id}`,
            stepId: `${product.id}-step-${fIndex}`,
            title: feature,
            description: `Executável do produto "${product.name}" para ${clientName}`,
            status: 'todo' as Task['status'],
            priority: fIndex === 0 ? 'high' as const : 'medium' as const,
            area: 'strategy' as Task['area'],
            createdAt: new Date().toISOString(),
            checklist: generateDefaultChecklist(feature),
            productId: product.id,
            productName: product.name,
        }))
    );
}

interface TasksContextType {
    tasks: Task[];
    isLoading: boolean;

    // CRUD de Tasks
    getTaskById: (taskId: string) => Task | undefined;
    getTasksByClient: (clientId: string) => Task[];
    getTaskByStepId: (stepId: string) => Task | undefined;

    // Criar task a partir de um step da timeline
    createTaskFromStep: (
        clientId: string,
        phaseId: string,
        step: ProcessStep
    ) => Task;

    // Atualizar task
    updateTask: (taskId: string, updates: Partial<Task>) => void;

    // Mover task (status)
    moveTask: (taskId: string, newStatus: Task['status']) => void;

    // Checklist
    toggleChecklistItem: (taskId: string, checklistItemId: string) => void;
    addChecklistItem: (taskId: string, title: string) => void;
    removeChecklistItem: (taskId: string, checklistItemId: string) => void;

    // Sincronização - callback para quando task mudar
    onTaskStatusChange?: (taskId: string, newStatus: Task['status'], stepId?: string) => void;
    setOnTaskStatusChange: (callback: (taskId: string, newStatus: Task['status'], stepId?: string) => void) => void;

    // Abrir modal de detalhes
    selectedTask: Task | null;
    openTaskDetail: (task: Task) => void;
    closeTaskDetail: () => void;

    // Recarregar tasks dos clientes
    loadClientTasks: () => Promise<void>;
}

const TasksContext = createContext<TasksContextType | null>(null);

export function TasksProvider({ children }: { children: ReactNode }) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [onTaskStatusChangeCallback, setOnTaskStatusChangeCallback] = useState<
        ((taskId: string, newStatus: Task['status'], stepId?: string) => void) | undefined
    >();

    // Carregar tasks dos clientes do Supabase
    const loadClientTasks = useCallback(async () => {
        try {
            setIsLoading(true);

            // Buscar todos os clientes com seus produtos atribuídos
            const { data: clients, error } = await (supabase as any)
                .from('agency_clients')
                .select('id, name, assigned_products')
                .not('assigned_products', 'is', null);

            if (error) {
                console.error('[TasksContext] Error loading clients:', error);
                // Fallback para MOCK_TASKS
                const tasksWithChecklist = MOCK_TASKS.map(task => ({
                    ...task,
                    checklist: task.checklist || generateDefaultChecklist(task.title),
                }));
                setTasks(tasksWithChecklist);
                return;
            }

            // Gerar tasks a partir dos produtos atribuídos
            const productTasks: Task[] = [];
            for (const client of clients || []) {
                if (client.assigned_products && client.assigned_products.length > 0) {
                    const clientTasks = generateTasksFromProducts(
                        client.id,
                        client.name,
                        client.assigned_products
                    );
                    productTasks.push(...clientTasks);
                }
            }

            console.log('[TasksContext] Loaded product tasks:', productTasks.length);
            setTasks(productTasks);
        } catch (err) {
            console.error('[TasksContext] Failed to load tasks:', err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Inicializar carregando tasks reais
    useEffect(() => {
        loadClientTasks();
    }, [loadClientTasks]);

    const getTaskById = useCallback((taskId: string) => {
        return tasks.find(t => t.id === taskId);
    }, [tasks]);

    const getTasksByClient = useCallback((clientId: string) => {
        return tasks.filter(t => t.clientId === clientId);
    }, [tasks]);

    const getTaskByStepId = useCallback((stepId: string) => {
        return tasks.find(t => t.stepId === stepId);
    }, [tasks]);

    const createTaskFromStep = useCallback((
        clientId: string,
        phaseId: string,
        step: ProcessStep
    ): Task => {
        // Verifica se já existe task para esse step
        const existingTask = tasks.find(t => t.stepId === step.id);
        if (existingTask) {
            return existingTask;
        }

        const newTask: Task = {
            id: `t_${Date.now()}`,
            clientId,
            phaseId,
            stepId: step.id,
            title: step.title,
            description: step.description || `Demanda da timeline: ${step.title}`,
            status: mapStepStatusToTaskStatus(step.status),
            priority: 'medium',
            area: mapRoleToArea(step.assigneeRole),
            createdAt: new Date().toISOString(),
            checklist: generateDefaultChecklist(step.title),
        };

        setTasks(prev => [...prev, newTask]);
        return newTask;
    }, [tasks]);

    const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, ...updates } : t
        ));

        // Se status mudou, notificar callback de sincronização
        if (updates.status) {
            const task = tasks.find(t => t.id === taskId);
            if (task && onTaskStatusChangeCallback) {
                onTaskStatusChangeCallback(taskId, updates.status, task.stepId);
            }
        }
    }, [tasks, onTaskStatusChangeCallback]);

    const moveTask = useCallback((taskId: string, newStatus: Task['status']) => {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;

        const updates: Partial<Task> = { status: newStatus };

        // Se moveu para done, marca completedAt
        if (newStatus === 'done') {
            updates.completedAt = new Date().toISOString();
        } else {
            updates.completedAt = undefined;
        }

        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, ...updates } : t
        ));

        // Notificar callback de sincronização
        if (onTaskStatusChangeCallback && task.stepId) {
            onTaskStatusChangeCallback(taskId, newStatus, task.stepId);
        }
    }, [tasks, onTaskStatusChangeCallback]);

    const toggleChecklistItem = useCallback((taskId: string, checklistItemId: string) => {
        setTasks(prev => prev.map(task => {
            if (task.id !== taskId) return task;

            const updatedChecklist = task.checklist?.map(item => {
                if (item.id !== checklistItemId) return item;
                return {
                    ...item,
                    isCompleted: !item.isCompleted,
                    completedAt: !item.isCompleted ? new Date().toISOString() : undefined,
                };
            });

            // Verificar se todos os itens estão completos
            const allCompleted = updatedChecklist?.every(item => item.isCompleted);
            const anyCompleted = updatedChecklist?.some(item => item.isCompleted);
            let newStatus = task.status;

            // Se todos completos, mover para done
            if (allCompleted && task.status !== 'done') {
                newStatus = 'done';
                if (onTaskStatusChangeCallback && task.stepId) {
                    onTaskStatusChangeCallback(task.id, 'done', task.stepId);
                }
            }
            // Se marcou algum item e ainda esta em todo/backlog, mover para in_progress
            else if (anyCompleted && (task.status === 'todo' || task.status === 'backlog')) {
                newStatus = 'in_progress';
                if (onTaskStatusChangeCallback && task.stepId) {
                    onTaskStatusChangeCallback(task.id, 'in_progress', task.stepId);
                }
            }
            // Se tinha algum incompleto após estar done, voltar para in_progress
            else if (!allCompleted && task.status === 'done') {
                newStatus = 'in_progress';
                if (onTaskStatusChangeCallback && task.stepId) {
                    onTaskStatusChangeCallback(task.id, 'in_progress', task.stepId);
                }
            }

            return {
                ...task,
                checklist: updatedChecklist,
                status: newStatus,
                completedAt: allCompleted ? new Date().toISOString() : undefined,
            };
        }));
    }, [onTaskStatusChangeCallback]);

    const addChecklistItem = useCallback((taskId: string, title: string) => {
        setTasks(prev => prev.map(task => {
            if (task.id !== taskId) return task;

            const newItem: ChecklistItem = {
                id: `cl_${Date.now()}`,
                title,
                isCompleted: false,
            };

            return {
                ...task,
                checklist: [...(task.checklist || []), newItem],
            };
        }));
    }, []);

    const removeChecklistItem = useCallback((taskId: string, checklistItemId: string) => {
        setTasks(prev => prev.map(task => {
            if (task.id !== taskId) return task;

            return {
                ...task,
                checklist: task.checklist?.filter(item => item.id !== checklistItemId),
            };
        }));
    }, []);

    const setOnTaskStatusChange = useCallback((
        callback: (taskId: string, newStatus: Task['status'], stepId?: string) => void
    ) => {
        setOnTaskStatusChangeCallback(() => callback);
    }, []);

    const openTaskDetail = useCallback((task: Task) => {
        setSelectedTask(task);
    }, []);

    const closeTaskDetail = useCallback(() => {
        setSelectedTask(null);
    }, []);

    return (
        <TasksContext.Provider value={{
            tasks,
            isLoading,
            getTaskById,
            getTasksByClient,
            getTaskByStepId,
            createTaskFromStep,
            updateTask,
            moveTask,
            toggleChecklistItem,
            addChecklistItem,
            removeChecklistItem,
            setOnTaskStatusChange,
            selectedTask,
            openTaskDetail,
            closeTaskDetail,
            loadClientTasks,
        }}>
            {children}
        </TasksContext.Provider>
    );
}

export function useTasks() {
    const context = useContext(TasksContext);
    if (!context) {
        throw new Error('useTasks must be used within a TasksProvider');
    }
    return context;
}
