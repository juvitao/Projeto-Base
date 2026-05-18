import { useState } from "react";
import Papa from "papaparse";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Download, Upload, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { BulkInventoryItem } from "@/hooks/useBulkInventory";

interface Props {
    onLoaded: (items: BulkInventoryItem[]) => void;
}

const CSV_HEADERS = ["marca", "produto", "categoria", "qty", "preco_venda", "comissao_pct", "validade_mm_aaaa"];

/**
 * Schema Zod por linha do CSV. Espelha a validacao do RPC bulk_add_to_inventory.
 * - z.coerce.* converte strings ("12", "59,90") em numeros automaticamente.
 * - Aceita virgula brasileira no preco (transform).
 */
const csvRowSchema = z.object({
    marca: z.string().trim().min(1, "Marca obrigatoria"),
    produto: z.string().trim().min(1, "Produto obrigatorio"),
    categoria: z.string().trim().optional().or(z.literal("")),
    qty: z.coerce.number().int("Qty deve ser inteiro").positive("Qty deve ser > 0"),
    preco_venda: z.preprocess(
        (val) => typeof val === "string" ? parseFloat(val.replace(",", ".")) : val,
        z.number().positive("Preco deve ser > 0")
    ),
    comissao_pct: z.preprocess(
        (val) => typeof val === "string" && val ? parseFloat(val.replace(",", ".")) : val,
        z.number().min(0).max(100).default(30)
    ),
    validade_mm_aaaa: z.string().regex(/^\d{2}\/\d{4}$/, "Validade no formato MM/AAAA").optional().or(z.literal("")),
});

function downloadTemplate() {
    // Cabecalho + 1 linha de exemplo
    const csv = [
        CSV_HEADERS.join(","),
        "Natura,Desodorante Colonia Kaiak Masculino,Perfumaria,2,169.90,30,12/2027",
        "Boticario,Malbec 100ml,Perfumaria,1,199.90,25,",
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "template-entrada-estoque.csv";
    link.click();
    URL.revokeObjectURL(url);
}

export function CsvImportStep({ onLoaded }: Props) {
    const { toast } = useToast();
    const [errors, setErrors] = useState<string[]>([]);
    const [isParsing, setIsParsing] = useState(false);

    const handleFile = (file: File) => {
        setErrors([]);
        setIsParsing(true);

        Papa.parse<Record<string, string>>(file, {
            header: true,
            skipEmptyLines: true,
            transformHeader: (h) => h.trim().toLowerCase(),
            complete: (result) => {
                setIsParsing(false);

                if (result.errors.length > 0) {
                    setErrors(result.errors.map((e) => `Linha ${e.row}: ${e.message}`));
                    return;
                }

                const missingHeaders = CSV_HEADERS.filter((h) => !result.meta.fields?.includes(h));
                // Os 4 obrigatorios para o RPC sao: marca, produto, qty, preco_venda
                const required = ["marca", "produto", "qty", "preco_venda"];
                const missingRequired = required.filter((h) => missingHeaders.includes(h));
                if (missingRequired.length > 0) {
                    setErrors([`Colunas obrigatorias faltando: ${missingRequired.join(", ")}`]);
                    return;
                }

                const items: BulkInventoryItem[] = [];
                const rowErrors: string[] = [];

                result.data.forEach((row, i) => {
                    const parsed = csvRowSchema.safeParse(row);
                    if (!parsed.success) {
                        const msg = parsed.error.issues.map((iss) => `${iss.path.join(".")}: ${iss.message}`).join("; ");
                        rowErrors.push(`Linha ${i + 2}: ${msg}`);
                        return;
                    }
                    const r = parsed.data;
                    const cost = Math.round((r.preco_venda - r.preco_venda * (r.comissao_pct / 100)) * 100) / 100;
                    items.push({
                        brand_name: r.marca,
                        product_name: r.produto,
                        category: r.categoria || undefined,
                        quantity: r.qty,
                        sale_price: r.preco_venda,
                        cost_price: cost,
                        expiration_date: r.validade_mm_aaaa || null,
                        _ui: { from: "csv" },
                    });
                });

                if (rowErrors.length > 0) {
                    setErrors(rowErrors);
                }
                if (items.length > 0) {
                    toast({ title: `${items.length} linha(s) carregada(s)`, description: rowErrors.length > 0 ? `${rowErrors.length} linha(s) ignorada(s) por erro` : undefined });
                    onLoaded(items);
                } else {
                    toast({ title: "Nenhuma linha valida encontrada", variant: "destructive" });
                }
            },
            error: (err) => {
                setIsParsing(false);
                setErrors([`Erro ao ler arquivo: ${err.message}`]);
            },
        });
    };

    return (
        <div className="space-y-4">
            <div className="bg-muted/30 border rounded-lg p-4 space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Importar planilha
                </Label>
                <p className="text-sm text-muted-foreground">
                    Baixe o template, preencha no Excel/Google Sheets e suba o arquivo. Colunas obrigatorias:
                    <code className="mx-1 px-1.5 py-0.5 rounded bg-muted text-[11px]">marca, produto, qty, preco_venda</code>.
                </p>
                <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={downloadTemplate}>
                        <Download className="h-4 w-4 mr-1" /> Baixar template
                    </Button>
                    <Label htmlFor="csv-upload" className="cursor-pointer">
                        <Input
                            id="csv-upload"
                            type="file"
                            accept=".csv,text/csv"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleFile(f);
                                e.target.value = "";
                            }}
                            disabled={isParsing}
                        />
                        <span className="inline-flex items-center h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
                            <Upload className="h-4 w-4 mr-1" />
                            {isParsing ? "Lendo..." : "Selecionar CSV"}
                        </span>
                    </Label>
                </div>
            </div>

            {errors.length > 0 && (
                <div className="border border-destructive/50 bg-destructive/5 rounded-lg p-3 space-y-1">
                    <div className="flex items-center gap-2 text-sm font-bold text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        Erros encontrados ({errors.length})
                    </div>
                    <ul className="text-xs text-destructive/90 space-y-0.5 list-disc list-inside max-h-32 overflow-y-auto">
                        {errors.slice(0, 50).map((e, i) => <li key={i}>{e}</li>)}
                        {errors.length > 50 && <li>+ {errors.length - 50} erro(s) adicionais...</li>}
                    </ul>
                </div>
            )}
        </div>
    );
}
