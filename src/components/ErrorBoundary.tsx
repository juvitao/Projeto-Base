import { Component, ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log detalhado apenas no console (não expõe pro usuário)
        console.error("[ErrorBoundary] Erro capturado:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            const isDev = import.meta.env.DEV;

            return (
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100vh",
                    fontFamily: "system-ui, sans-serif",
                    padding: "20px",
                    textAlign: "center",
                    background: "#fafafa",
                    color: "#333",
                }}>
                    <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
                        Ops, algo deu errado!
                    </h2>
                    <p style={{ color: "#666", marginBottom: "1.5rem" }}>
                        Tente recarregar a página. Se o problema persistir, entre em contato com o suporte.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: "10px 24px",
                            borderRadius: "8px",
                            border: "none",
                            background: "#7c3aed",
                            color: "white",
                            cursor: "pointer",
                            fontSize: "1rem",
                        }}
                    >
                        Recarregar
                    </button>
                    {isDev && this.state.error && (
                        <pre style={{
                            marginTop: "2rem",
                            background: "#f8d7da",
                            padding: "10px",
                            borderRadius: "5px",
                            overflow: "auto",
                            maxWidth: "90vw",
                            fontSize: "0.8rem",
                            textAlign: "left",
                            color: "red",
                        }}>
                            {this.state.error.message}
                            {"\n"}
                            {this.state.error.stack}
                        </pre>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

