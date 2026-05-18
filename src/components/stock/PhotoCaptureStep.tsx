import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Camera, Loader2, RefreshCw, Sparkles } from "lucide-react";

interface Props {
    isAnalyzing: boolean;
    onAnalyze: (file: File) => void;
}

const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.8;

/**
 * Redimensiona a imagem mantendo aspect ratio, retorna um File JPEG.
 * Limita ao maior lado = 1024px e quality 0.8 — equilibra tamanho (~50-150KB)
 * e legibilidade para o Gemini.
 */
async function resizeImage(file: File): Promise<File> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = dataUrl;
    });

    const ratio = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    const w = Math.round(img.width * ratio);
    const h = Math.round(img.height * ratio);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D nao disponivel");
    ctx.drawImage(img, 0, 0, w, h);

    return new Promise<File>((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) return reject(new Error("Falha ao gerar JPEG"));
                resolve(new File([blob], "photo.jpg", { type: "image/jpeg" }));
            },
            "image/jpeg",
            JPEG_QUALITY
        );
    });
}

export function PhotoCaptureStep({ isAnalyzing, onAnalyze }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [resizedFile, setResizedFile] = useState<File | null>(null);

    const handleFile = async (file: File) => {
        try {
            const resized = await resizeImage(file);
            setResizedFile(resized);
            setPreview(URL.createObjectURL(resized));
        } catch (err) {
            console.error("Erro ao processar foto:", err);
        }
    };

    const reset = () => {
        if (preview) URL.revokeObjectURL(preview);
        setPreview(null);
        setResizedFile(null);
        if (inputRef.current) inputRef.current.value = "";
    };

    return (
        <div className="space-y-4">
            <div className="bg-muted/30 border rounded-lg p-4 space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Tirar/enviar foto
                </Label>
                <p className="text-sm text-muted-foreground">
                    Coloque os produtos lado a lado com etiquetas/marcas visiveis. Iluminacao boa
                    melhora muito o resultado. A foto eh apagada apos a analise.
                </p>

                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f);
                    }}
                />

                {!preview ? (
                    <Button onClick={() => inputRef.current?.click()} size="lg" className="w-full sm:w-auto">
                        <Camera className="h-4 w-4 mr-2" />
                        Tirar/Selecionar foto
                    </Button>
                ) : (
                    <div className="space-y-3">
                        <img
                            src={preview}
                            alt="Preview da foto"
                            className="rounded-lg max-h-72 object-contain border bg-background"
                        />
                        <div className="flex flex-wrap gap-2">
                            <Button
                                onClick={() => resizedFile && onAnalyze(resizedFile)}
                                disabled={isAnalyzing || !resizedFile}
                                size="lg"
                            >
                                {isAnalyzing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                                {isAnalyzing ? "Analisando..." : "Analisar produtos na foto"}
                            </Button>
                            <Button variant="outline" onClick={reset} disabled={isAnalyzing}>
                                <RefreshCw className="h-4 w-4 mr-2" /> Trocar foto
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
