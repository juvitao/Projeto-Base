import { Settings } from "lucide-react";

const SettingsPage = () => {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">CONFIGURAÇÕES</h1>
            <div className="h-[400px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl space-y-4">
                <Settings className="w-12 h-12 text-muted-foreground" />
                <p className="text-muted-foreground">Ajustes do sistema em construção.</p>
            </div>
        </div>
    );
};

export default SettingsPage;
