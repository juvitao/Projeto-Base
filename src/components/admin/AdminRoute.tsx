import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface Props {
    children: React.ReactNode;
}

/**
 * Route guard: only allows access if the user's role is 'admin'.
 * Reads from JWT metadata (zero DB queries).
 * Sellers are silently redirected to '/'.
 */
export function AdminRoute({ children }: Props) {
    const { isLoading, user, isAdmin } = useAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}
