import { useState, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ParsedClient {
    name: string;
    phone: string;
    valid: boolean;
}

interface Props {
    open: boolean;
    onClose: () => void;
    onImported: () => void;
}

function parseClients(raw: string): ParsedClient[] {
    const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
    return lines.map(line => {
        // Try separators: tab, semicolon, comma
        let parts: string[] = [];
        if (line.includes("\t")) {
            parts = line.split("\t").map(s => s.trim());
        } else if (line.includes(";")) {
            parts = line.split(";").map(s => s.trim());
        } else if (line.includes(",")) {
            parts = line.split(",").map(s => s.trim());
        } else {
            parts = [line];
        }

        const name = parts[0] ?? "";
        const phone = parts[1] ?? "";

        return {
            name,
            phone,
            valid: name.length >= 2,
        };
    });
}

export function BulkClientImportDialog({ open, onClose, onImported }: Props) {
    const { toast } = useToast();
    const [rawText, setRawText] = useState("");
    const [isImporting, setIsImporting] = useState(false);
    const [result, setResult] = useState<{ imported: number; failed: number } | null>(null);

    const parsed = useMemo(() => parseClients(rawText), [rawText]);
    const validCount = parsed.filter(c => c.valid).length;

    const handleImport = async () => {
        const valid = parsed.filter(c => c.valid);
        if (valid.length === 0) return;

        setIsImporting(true);
        setResult(null);
        try {
            const rows = valid.map(c => ({
                name: c.name,
                phone: c.phone || "",
            }));

            const { data, error } = await supabase
                .from("vora_clients")
                .insert(rows)
                .select();

            if (error) throw error;

            const imported = data?.length ?? 0;
            setResult({ imported, failed: valid.length - imported });
            toast({ title: `${imported} clientes importados!` });
            onImported();
        } catch (err: any) {
            toast({ title: "Erro ao importar", description: err.message, variant: "destructive" });
        } finally {
            setIsImporting(false);
        }
    };

    const handleClose = () => {
        setRawText("");
        setResult(null);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={v => !v && handleClose()}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                        <Upload className="w-5 h-5 text-primary" /> Importar Clientes em Lote
                    </DialogTitle>
                </DialogHeader>

                {result ? (
                    <div className="py-8 text-center space-y-3">
                        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                        <p className="text-lg font-bold">{result.imported} clientes importados!</p>
                        {result.failed > 0 && (
                            <p className="text-sm text-muted-foreground">{result.failed} não puderam ser importados</p>
                        )}
                        <Button onClick={handleClose} className="mt-4">Fechar</Button>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            <p className="text-xs text-muted-foreground">
                                Cole da sua planilha ou escreva, um cliente por linha.
                                Formatos aceitos: <code>Nome; Telefone</code> ou <code>Nome, Telefone</code> ou só <code>Nome</code>
                            </p>

                            <Textarea
                                placeholder={"Maria Silva; (11) 99999-1234\nJoão Santos; (21) 98888-5678\nAna Oliveira"}
                                value={rawText}
                                onChange={e => setRawText(e.target.value)}
                                rows={8}
                                className="font-mono text-xs"
                            />

                            {/* Preview */}
                            {parsed.length > 0 && (
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="bg-muted/50 px-3 py-2 border-b">
                                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            Prévia — {validCount} cliente{validCount !== 1 ? "s" : ""} válido{validCount !== 1 ? "s" : ""}
                                        </p>
                                    </div>
                                    <div className="max-h-[200px] overflow-y-auto">
                                        {parsed.slice(0, 20).map((c, i) => (
                                            <div
                                                key={i}
                                                className={`flex items-center gap-2 px-3 py-1.5 text-xs border-b last:border-0 ${
                                                    c.valid ? "" : "bg-red-500/5 text-red-400"
                                                }`}
                                            >
                                                {c.valid ? (
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                                ) : (
                                                    <AlertCircle className="w-3 h-3 text-red-400 shrink-0" />
                                                )}
                                                <span className="font-medium">{c.name || "—"}</span>
                                                <span className="text-muted-foreground ml-auto">{c.phone || "sem telefone"}</span>
                                            </div>
                                        ))}
                                        {parsed.length > 20 && (
                                            <p className="text-[10px] text-muted-foreground text-center py-1">
                                                +{parsed.length - 20} mais...
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                                Cancelar
                            </Button>
                            <Button onClick={handleImport} disabled={isImporting || validCount === 0} className="gap-1.5">
                                {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                                Importar {validCount} cliente{validCount !== 1 ? "s" : ""}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
