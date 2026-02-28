import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
    open: boolean;
    onClose: () => void;
    onCreated: (client: { id: string; name: string; phone: string }) => void;
}

export function QuickClientDialog({ open, onClose, onCreated }: Props) {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async () => {
        if (!name || !phone) return;
        setIsSubmitting(true);
        try {
            const { data, error } = await supabase
                .from("vora_clients")
                .insert({ name, phone })
                .select()
                .single();
            if (error) throw error;
            toast({ title: "Cliente criado!" });
            onCreated({ id: data.id, name: data.name, phone: data.phone });
            setName("");
            setPhone("");
            onClose();
        } catch (err: any) {
            toast({ title: "Erro", description: err.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Cliente Rápido</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Nome *</Label>
                        <Input placeholder="Nome do cliente" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Telefone *</Label>
                        <Input placeholder="(00) 00000-0000" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancelar</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting || !name || !phone}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Criar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
