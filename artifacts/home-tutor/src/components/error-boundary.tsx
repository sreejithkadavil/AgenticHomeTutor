import React from "react";

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; resetKey?: any },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; resetKey?: any }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: { resetKey?: any }) {
    if (this.props.resetKey !== prevProps.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-lg mx-auto bg-destructive/10 rounded-xl border border-destructive/20 text-destructive mt-12">
          <h2 className="text-lg font-bold mb-2">Something went wrong</h2>
          <pre className="text-xs bg-background p-4 rounded-md overflow-auto whitespace-pre-wrap">
            {this.state.error?.message}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-destructive text-destructive-foreground px-4 py-2 rounded-md font-medium"
          >
            Reload application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
