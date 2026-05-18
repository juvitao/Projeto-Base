import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PhotoCaptureStep } from "@/components/stock/PhotoCaptureStep";
import { CsvImportStep } from "@/components/stock/CsvImportStep";
import { BulkInventoryReview } from "@/components/stock/BulkInventoryReview";
import { useBulkInventory, type BulkInventoryItem } from "@/hooks/useBulkInventory";

type Phase = "choosing" | "reviewing";

const EntradaPorFoto = () => {
    const navigate = useNavigate();
    const { analyzePhoto, commitBulk, isAnalyzing, isCommitting } = useBulkInventory();
    const [phase, setPhase] = useState<Phase>("choosing");
    const [items, setItems] = useState<BulkInventoryItem[]>([]);

    const handleAnalyze = async (file: File) => {
        try {
            const detected = await analyzePhoto(file);
            if (detected.length === 0) {
                // analyzePhoto ja exibiu toast de erro; mantemos na fase de escolha
                return;
            }
            setItems(detected);
            setPhase("reviewing");
        } catch {
            // toast ja exibido pelo hook
        }
    };

    const handleCsvLoaded = (loaded: BulkInventoryItem[]) => {
        setItems(loaded);
        setPhase("reviewing");
    };

    const handleManualStart = () => {
        setItems([{
            brand_name: "",
            product_name: "",
            quantity: 1,
            sale_price: 0,
            cost_price: 0,
            _ui: { from: "manual" },
        }]);
        setPhase("reviewing");
    };

    const handleConfirm = async (toCommit: BulkInventoryItem[]) => {
        const count = await commitBulk(toCommit);
        if (count > 0) {
            navigate("/stock");
        }
    };

    const handleBack = () => {
        if (phase === "reviewing") {
            setPhase("choosing");
            setItems([]);
        } else {
            navigate("/stock");
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto px-4 pb-20">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Voltar">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="space-y-0.5">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase flex items-center gap-2">
                        <Package className="w-6 h-6 text-primary" />
                        Entrada em massa
                    </h1>
                    <p className="text-muted-foreground text-xs">
                        {phase === "choosing"
                            ? "Tire uma foto dos produtos ou importe uma planilha"
                            : "Revise, defina precos e adicione tudo de uma vez"}
                    </p>
                </div>
            </div>

            {phase === "choosing" && (
                <Tabs defaultValue="photo">
                    <TabsList className="grid grid-cols-3 max-w-md">
                        <TabsTrigger value="photo">Por foto</TabsTrigger>
                        <TabsTrigger value="csv">Por planilha</TabsTrigger>
                        <TabsTrigger value="manual">Manual</TabsTrigger>
                    </TabsList>
                    <TabsContent value="photo" className="mt-4">
                        <PhotoCaptureStep isAnalyzing={isAnalyzing} onAnalyze={handleAnalyze} />
                    </TabsContent>
                    <TabsContent value="csv" className="mt-4">
                        <CsvImportStep onLoaded={handleCsvLoaded} />
                    </TabsContent>
                    <TabsContent value="manual" className="mt-4">
                        <div className="bg-muted/30 border rounded-lg p-6 text-center space-y-3">
                            <p className="text-sm text-muted-foreground">
                                Comece com uma linha vazia e adicione quantas precisar.
                            </p>
                            <Button onClick={handleManualStart}>Comecar manualmente</Button>
                        </div>
                    </TabsContent>
                </Tabs>
            )}

            {phase === "reviewing" && (
                <BulkInventoryReview
                    initialItems={items}
                    onCancel={handleBack}
                    onConfirm={handleConfirm}
                    isCommitting={isCommitting}
                />
            )}
        </div>
    );
};

export default EntradaPorFoto;
