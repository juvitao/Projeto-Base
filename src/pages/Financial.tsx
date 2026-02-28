import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown, Clock, LayoutDashboard } from "lucide-react";

import { FinancialKPICards } from "@/components/financial/FinancialKPICards";
import { EntryFormDialog } from "@/components/financial/EntryFormDialog";
import { EntriesTable } from "@/components/financial/EntriesTable";
import { ReceivableFormDialog } from "@/components/financial/ReceivableFormDialog";
import { ReceivablesTable } from "@/components/financial/ReceivablesTable";

import { useFinancialEntries } from "@/hooks/useFinancialEntries";
import { useReceivables } from "@/hooks/useReceivables";
import { useFinancialKPIs } from "@/hooks/useFinancialKPIs";

import type { Database } from "@/integrations/supabase/types";

type FinancialEntry = Database["public"]["Tables"]["vora_financial_entries"]["Row"];
type Receivable = Database["public"]["Tables"]["vora_receivables"]["Row"];

const Financial = () => {
    const [activeTab, setActiveTab] = useState("overview");

    // Data hooks
    const incomeHook = useFinancialEntries({ typeFilter: "income" });
    const expenseHook = useFinancialEntries({ typeFilter: "expense" });
    const receivableHook = useReceivables();
    const { kpis, isLoading: kpiLoading } = useFinancialKPIs();

    // Dialog state
    const [incomeDialogOpen, setIncomeDialogOpen] = useState(false);
    const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);
    const [receivableDialogOpen, setReceivableDialogOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null);
    const [editingReceivable, setEditingReceivable] = useState<Receivable | null>(null);
    const [entryDialogType, setEntryDialogType] = useState<"income" | "expense">("income");

    // Handlers: Income
    const openNewIncome = () => { setEditingEntry(null); setEntryDialogType("income"); setIncomeDialogOpen(true); };
    const openEditIncome = (e: FinancialEntry) => { setEditingEntry(e); setEntryDialogType("income"); setIncomeDialogOpen(true); };
    const handleSaveIncome = async (data: any) => {
        if (editingEntry) {
            await incomeHook.updateEntry(editingEntry.id, data);
        } else {
            await incomeHook.createEntry(data);
        }
    };

    // Handlers: Expense
    const openNewExpense = () => { setEditingEntry(null); setEntryDialogType("expense"); setExpenseDialogOpen(true); };
    const openEditExpense = (e: FinancialEntry) => { setEditingEntry(e); setEntryDialogType("expense"); setExpenseDialogOpen(true); };
    const handleSaveExpense = async (data: any) => {
        if (editingEntry) {
            await expenseHook.updateEntry(editingEntry.id, data);
        } else {
            await expenseHook.createEntry(data);
        }
    };

    // Handlers: Receivables
    const openNewReceivable = () => { setEditingReceivable(null); setReceivableDialogOpen(true); };
    const openEditReceivable = (r: Receivable) => { setEditingReceivable(r); setReceivableDialogOpen(true); };
    const handleSaveReceivable = async (data: any) => {
        if (editingReceivable) {
            await receivableHook.updateReceivable(editingReceivable.id, data);
        } else {
            await receivableHook.createReceivable(data);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight uppercase">Financeiro</h1>
                    <p className="text-sm text-muted-foreground">Controle seu fluxo de caixa pessoal</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="grid w-full grid-cols-4 h-auto">
                    <TabsTrigger value="overview" className="text-xs sm:text-sm py-2 gap-1.5">
                        <LayoutDashboard className="h-3.5 w-3.5 hidden sm:block" />
                        Visão Geral
                    </TabsTrigger>
                    <TabsTrigger value="income" className="text-xs sm:text-sm py-2 gap-1.5">
                        <TrendingUp className="h-3.5 w-3.5 hidden sm:block" />
                        Receitas
                    </TabsTrigger>
                    <TabsTrigger value="expenses" className="text-xs sm:text-sm py-2 gap-1.5">
                        <TrendingDown className="h-3.5 w-3.5 hidden sm:block" />
                        Despesas
                    </TabsTrigger>
                    <TabsTrigger value="receivables" className="text-xs sm:text-sm py-2 gap-1.5">
                        <Clock className="h-3.5 w-3.5 hidden sm:block" />
                        Recebíveis
                    </TabsTrigger>
                </TabsList>

                {/* ======================== VISÃO GERAL ======================== */}
                <TabsContent value="overview" className="space-y-6">
                    <FinancialKPICards kpis={kpis} isLoading={kpiLoading} />

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-sm">Últimas Receitas</h3>
                                <Button variant="outline" size="sm" onClick={() => setActiveTab("income")}>
                                    Ver todas
                                </Button>
                            </div>
                            <EntriesTable
                                entries={incomeHook.entries.slice(0, 5)}
                                isLoading={incomeHook.isLoading}
                                type="income"
                                onEdit={openEditIncome}
                                onDelete={incomeHook.deleteEntry}
                            />
                        </div>
                        <div className="rounded-xl border p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-sm">Últimas Despesas</h3>
                                <Button variant="outline" size="sm" onClick={() => setActiveTab("expenses")}>
                                    Ver todas
                                </Button>
                            </div>
                            <EntriesTable
                                entries={expenseHook.entries.slice(0, 5)}
                                isLoading={expenseHook.isLoading}
                                type="expense"
                                onEdit={openEditExpense}
                                onDelete={expenseHook.deleteEntry}
                            />
                        </div>
                    </div>
                </TabsContent>

                {/* ======================== RECEITAS ======================== */}
                <TabsContent value="income" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold">Receitas</h2>
                        <Button onClick={openNewIncome} size="sm" className="gap-1.5">
                            <Plus className="h-4 w-4" /> Nova Receita
                        </Button>
                    </div>
                    <EntriesTable
                        entries={incomeHook.entries}
                        isLoading={incomeHook.isLoading}
                        type="income"
                        onEdit={openEditIncome}
                        onDelete={incomeHook.deleteEntry}
                    />
                </TabsContent>

                {/* ======================== DESPESAS ======================== */}
                <TabsContent value="expenses" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold">Despesas</h2>
                        <Button onClick={openNewExpense} size="sm" className="gap-1.5">
                            <Plus className="h-4 w-4" /> Nova Despesa
                        </Button>
                    </div>
                    <EntriesTable
                        entries={expenseHook.entries}
                        isLoading={expenseHook.isLoading}
                        type="expense"
                        onEdit={openEditExpense}
                        onDelete={expenseHook.deleteEntry}
                    />
                </TabsContent>

                {/* ======================== RECEBÍVEIS ======================== */}
                <TabsContent value="receivables" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold">Recebíveis / Fiados</h2>
                        <Button onClick={openNewReceivable} size="sm" className="gap-1.5">
                            <Plus className="h-4 w-4" /> Novo Fiado
                        </Button>
                    </div>
                    <ReceivablesTable
                        receivables={receivableHook.receivables}
                        isLoading={receivableHook.isLoading}
                        onEdit={openEditReceivable}
                        onDelete={receivableHook.deleteReceivable}
                        onMarkPaid={receivableHook.markAsPaid}
                    />
                </TabsContent>
            </Tabs>

            {/* ======================== DIALOGS ======================== */}
            <EntryFormDialog
                open={incomeDialogOpen}
                onClose={() => setIncomeDialogOpen(false)}
                onSave={handleSaveIncome}
                type="income"
                editData={editingEntry}
            />
            <EntryFormDialog
                open={expenseDialogOpen}
                onClose={() => setExpenseDialogOpen(false)}
                onSave={handleSaveExpense}
                type="expense"
                editData={editingEntry}
            />
            <ReceivableFormDialog
                open={receivableDialogOpen}
                onClose={() => setReceivableDialogOpen(false)}
                onSave={handleSaveReceivable}
                editData={editingReceivable}
            />
        </div>
    );
};

export default Financial;
