import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 border border-red-100">
                        <h1 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h1>
                        <p className="text-slate-600 mb-4">
                            The application encountered an unexpected error.
                        </p>
                        <div className="bg-slate-100 p-3 rounded text-xs font-mono text-slate-700 overflow-auto max-h-40 mb-4">
                            {this.state.error?.message}
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-indigo-600 text-white py-2 px-4 rounded hover:bg-indigo-700 transition"
                        >
                            Reload Page
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
