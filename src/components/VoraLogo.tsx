import { cn } from "@/lib/utils";

interface VoraLogoProps {
    className?: string;
    size?: "sm" | "md" | "lg";
    withText?: boolean;
}

export function VoraLogo({ className, size = "md", withText = true }: VoraLogoProps) {
    const sizes = {
        sm: "h-7",
        md: "h-9",
        lg: "h-14",
    };

    return (
        <div className={cn("flex items-center gap-3 select-none", className)}>
            {/* Chain-link logo matching Vora brand */}
            <svg
                viewBox="0 0 100 100"
                className={cn(sizes[size], "w-auto")}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Bottom chain link — Deep teal */}
                <path
                    d="M55 80C55 86.6 49.6 92 43 92H30C23.4 92 18 86.6 18 80V55C18 48.4 23.4 43 30 43H40"
                    stroke="hsl(170, 100%, 18%)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    className="dark:stroke-[hsl(168,76%,36%)]"
                />
                <path
                    d="M55 80C55 86.6 49.6 92 43 92H30C23.4 92 18 86.6 18 80V55C18 48.4 23.4 43 30 43H40"
                    stroke="url(#greenGrad)"
                    strokeWidth="10"
                    strokeLinecap="round"
                />
                {/* Top chain link — Lavender */}
                <path
                    d="M45 20C45 13.4 50.4 8 57 8H70C76.6 8 82 13.4 82 20V45C82 51.6 76.6 57 70 57H60"
                    stroke="#B39DDB"
                    strokeWidth="10"
                    strokeLinecap="round"
                />
                <defs>
                    <linearGradient id="greenGrad" x1="18" y1="43" x2="55" y2="92" gradientUnits="userSpaceOnUse">
                        <stop stopColor="hsl(168, 76%, 36%)" />
                        <stop offset="1" stopColor="hsl(170, 100%, 18%)" />
                    </linearGradient>
                </defs>
            </svg>

            {withText && (
                <span className={cn(
                    "font-black tracking-[0.2em] uppercase text-foreground",
                    size === "sm" ? "text-lg" : size === "md" ? "text-xl" : "text-3xl"
                )}>
                    Vora
                </span>
            )}
        </div>
    );
}
