// ============================================
// Utilitários Financeiros
// ============================================

/**
 * Formata um valor numérico para Real brasileiro (BRL)
 */
export function formatBRL(value: number): string {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
    }).format(value);
}

/**
 * Calcula o valor líquido após dedução da taxa da maquininha
 */
export function calculateNetAmount(amount: number, feePercent: number): number {
    return amount - (amount * feePercent) / 100;
}

// Taxas padrão de maquininha (em %)
export const DEFAULT_CARD_FEES: Record<string, number> = {
    dinheiro: 0,
    pix: 0,
    debito: 1.99,
    credito_vista: 4.99,
    credito_2x: 6.99,
    credito_3x: 7.99,
    credito_6x: 9.99,
    credito_12x: 12.99,
};

// Labels de formas de pagamento
export const PAYMENT_METHODS = [
    { value: "dinheiro", label: "Dinheiro" },
    { value: "pix", label: "Pix" },
    { value: "debito", label: "Débito" },
    { value: "credito_vista", label: "Crédito à Vista" },
    { value: "credito_2x", label: "Crédito 2x" },
    { value: "credito_3x", label: "Crédito 3x" },
    { value: "credito_6x", label: "Crédito 6x" },
    { value: "credito_12x", label: "Crédito 12x" },
] as const;

// Categorias de receita
export const INCOME_CATEGORIES = [
    { value: "venda_produto", label: "Venda de Produto" },
    { value: "servico", label: "Serviço" },
    { value: "comissao", label: "Comissão" },
    { value: "outros_receita", label: "Outros" },
] as const;

// Categorias de despesa
export const EXPENSE_CATEGORIES = [
    { value: "compra_produtos", label: "Compra de Produtos" },
    { value: "frete", label: "Frete / Entrega" },
    { value: "embalagens", label: "Embalagens" },
    { value: "transporte", label: "Transporte" },
    { value: "internet_celular", label: "Internet / Celular" },
    { value: "marketing", label: "Marketing / Divulgação" },
    { value: "outros_despesa", label: "Outros" },
] as const;

// Status de recebíveis
export const RECEIVABLE_STATUSES = [
    { value: "pending", label: "Pendente", color: "text-yellow-500" },
    { value: "paid", label: "Pago", color: "text-green-500" },
    { value: "overdue", label: "Atrasado", color: "text-red-500" },
] as const;

/**
 * Retorna o label de uma categoria a partir do value
 */
export function getCategoryLabel(value: string): string {
    const all = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];
    return all.find((c) => c.value === value)?.label ?? value;
}

/**
 * Retorna o label de um método de pagamento
 */
export function getPaymentLabel(value: string): string {
    return PAYMENT_METHODS.find((p) => p.value === value)?.label ?? value;
}

/**
 * Retorna info do status de recebível
 */
export function getStatusInfo(status: string) {
    return (
        RECEIVABLE_STATUSES.find((s) => s.value === status) ?? {
            value: status,
            label: status,
            color: "text-muted-foreground",
        }
    );
}

/**
 * Formata uma data ISO para dd/mm/aaaa
 */
export function formatDateBR(dateStr: string): string {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("pt-BR");
}
