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

    public render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: "20px", fontFamily: "monospace", color: "red" }}>
                    <h2>Oops, the application crashed!</h2>
                    <p>Please send this error to the developer:</p>
                    <pre style={{ background: "#f8d7da", padding: "10px", borderRadius: "5px", overflow: "auto" }}>
                        {this.state.error?.message}
                        <br />
                        {this.state.error?.stack}
                    </pre>
                </div>
            );
        }

        return this.props.children;
    }
}
