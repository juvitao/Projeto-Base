export type ClientStatus = 'onboarding' | 'implementation' | 'growth' | 'churned';

export type ServiceType = 'assessoria_completa' | 'trafego_pago' | 'consultoria';

export interface ClientFinancials {
    fixedFee: number;
    variableFeePercentage: number;
    currency: string;
    contractStartDate: string;
}

export interface AccessCredential {
    id: string;
    platform: 'shopify' | 'google_ads' | 'meta_ads' | 'reportana' | 'cardpanda' | 'drive' | 'kartpanda' | 'other';
    name: string;
    url?: string;
    username: string;
    password?: string; // Em produção seria criptografado ou não retornado
    notes?: string;
}

export interface ProcessStep {
    id: string;
    title: string;
    status: 'pending' | 'in_progress' | 'completed' | 'blocked';
    assigneeRole: 'head' | 'media_buyer' | 'dev' | 'designer';
    description?: string;
    completedAt?: string;
    // Vínculo com task no quadro de demandas
    linkedTaskId?: string;
}

export interface OnboardingPhase {
    id: string;
    title: string;
    steps: ProcessStep[];
    isLocked: boolean;
}

export interface Client {
    id: string;
    name: string;
    logoUrl?: string;
    primaryColor: string;
    status: ClientStatus;
    serviceType: ServiceType;
    financials: ClientFinancials;
    progress: number; // 0-100
    onboardingPhases: OnboardingPhase[];
    credentials: AccessCredential[];
}

// Item de checklist para processos dentro de uma tarefa
export interface ChecklistItem {
    id: string;
    title: string;
    isCompleted: boolean;
    completedAt?: string;
    completedBy?: string; // ID do membro da equipe
    documentationUrl?: string; // Link para documentacao no Notion
}

// Tarefa expandida com suporte a checklist e vínculo com timeline
export interface Task {
    id: string;
    clientId: string;
    title: string;
    description: string;
    status: 'backlog' | 'todo' | 'in_progress' | 'validation' | 'done';
    assigneeId?: string; // ID do colaborador
    priority: 'low' | 'medium' | 'high' | 'critical';
    createdAt: string;
    dueDate?: string;
    area?: 'traffic' | 'design' | 'copy' | 'strategy' | 'dev';
    // Campos para sincronização com Timeline
    phaseId?: string; // ID da fase na timeline
    stepId?: string; // ID do step na timeline (vincula task ao step)
    // Checklist de processos
    checklist?: ChecklistItem[];
    completedAt?: string;
}

// Status da tarefa mapeado para Timeline
export type TaskStatusMap = {
    'pending': 'todo';
    'in_progress': 'in_progress';
    'completed': 'done';
    'blocked': 'backlog';
};

// Templates de processos para cada tipo de demanda
export interface ProcessTemplate {
    id: string;
    title: string;
    description?: string;
    defaultChecklist: Omit<ChecklistItem, 'id' | 'isCompleted' | 'completedAt' | 'completedBy'>[];
}
