import { InstanceStatus } from "@/components/evolution/InstanceStatus";
import { SendMessageTest } from "@/components/evolution/SendMessageTest";

const Whatsapp = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Integração WhatsApp</h1>
            <p className="text-muted-foreground">Gerencie sua instância da Evolution API e teste envios de mensagens.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                    <SendMessageTest />
                </div>
                <div className="space-y-6">
                    <InstanceStatus />
                </div>
            </div>
        </div>
    );
};

export default Whatsapp;
