import { createContext, useContext, useEffect, useState } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Types
export interface VoraProfile {
    id: string;
    user_id: string;
    role: "admin" | "seller";
    plan_id: string | null;
    is_active: boolean;
    business_name: string | null;
    phone: string | null;
    created_at: string;
    updated_at: string;
}

export interface VoraPlan {
    id: string;
    name: string;
    features_json: Record<string, boolean>;
    max_clients: number | null;
    price: number;
    has_ai_access: boolean;
}

interface AuthContextType {
    session: Session | null;
    user: User | null;
    isLoading: boolean;
    signOut: () => Promise<void>;
    // RBAC
    role: "admin" | "seller";
    isAdmin: boolean;
    // Profile & Plan
    profile: VoraProfile | null;
    plan: VoraPlan | null;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    isLoading: true,
    signOut: async () => { },
    role: "seller",
    isAdmin: false,
    profile: null,
    plan: null,
    refreshProfile: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [profile, setProfile] = useState<VoraProfile | null>(null);
    const [plan, setPlan] = useState<VoraPlan | null>(null);

    // Read role from JWT metadata (zero-latency, no extra DB query)
    const role: "admin" | "seller" =
        (user?.app_metadata?.role as "admin" | "seller") || "seller";
    const isAdmin = role === "admin";

    // Fetch full profile + plan from DB (called once on login)
    const fetchProfile = async (userId: string) => {
        try {
            const { data: prof } = await supabase
                .from("vora_profiles")
                .select("*")
                .eq("user_id", userId)
                .single();

            if (prof) {
                setProfile(prof as unknown as VoraProfile);

                if (prof.plan_id) {
                    const { data: planData } = await supabase
                        .from("vora_plans")
                        .select("*")
                        .eq("id", prof.plan_id)
                        .single();
                    if (planData) setPlan(planData as unknown as VoraPlan);
                }
            }
        } catch {
            // Profile may not exist yet (first login before trigger runs)
        }
    };

    const refreshProfile = async () => {
        if (user?.id) await fetchProfile(user.id);
    };

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user?.id) fetchProfile(session.user.id);
            setIsLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user?.id) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
                setPlan(null);
            }
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setPlan(null);
    };

    return (
        <AuthContext.Provider value={{
            session, user, isLoading, signOut,
            role, isAdmin,
            profile, plan, refreshProfile,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
