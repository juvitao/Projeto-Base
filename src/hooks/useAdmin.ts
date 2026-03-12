import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook for checking admin privileges.
 * Uses JWT metadata role (zero-latency).
 */
export function useAdmin() {
    const { isAdmin, role, profile } = useAuth();

    return {
        isAdmin,
        role,
        /** Whether the profile has been loaded from DB */
        profileLoaded: !!profile,
    };
}
