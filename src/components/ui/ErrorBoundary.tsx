import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
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
        <div className="min-h-screen bg-[#f8f9ff] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-[#c6c6cd] rounded-2xl shadow-xl p-8 text-center animate-in zoom-in-95 duration-200">
            <span className="material-symbols-outlined text-6xl text-red-500 mb-4 select-none">error_outline</span>
            <h2 className="text-xl font-bold text-[#0b1c30] mb-2">Something went wrong</h2>
            <p className="text-sm text-[#45464d] mb-6">
              An unexpected error occurred in this application. Please try reloading the page.
            </p>
            {this.state.error && (
              <pre className="text-[11px] font-mono bg-red-50 text-red-700 p-4 rounded-lg overflow-x-auto text-left mb-6 max-h-40 border border-red-200">
                {this.state.error.toString()}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#712ae2] hover:opacity-90 active:scale-95 text-white font-bold py-3 px-4 rounded-lg transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
