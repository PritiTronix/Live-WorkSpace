import React from 'react';

/**
 * ErrorBoundary
 * Catches runtime crashes in child components and displays a clear error card
 * with a "Try again" button, preventing blank screens.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center p-6 sm:p-12 text-center w-full min-h-[50vh]">
          <div className="bg-surface-card rounded-2xl p-6 sm:p-10 shadow-sm border border-border-subtle max-w-lg w-full flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-error-container/40 text-severity-blocker flex items-center justify-center mb-4 shadow-sm">
              <span className="material-symbols-outlined text-3xl">error</span>
            </div>
            <h2 className="font-headline-md text-headline-md text-text-primary mb-2">
              Something went wrong
            </h2>
            <p className="font-body-md text-body-md text-text-secondary mb-6 leading-relaxed">
              {this.state.error?.message || 'An unexpected error occurred while rendering this ticket view.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-5 py-2.5 rounded-lg bg-btn-primary hover:bg-primary-hover text-on-primary font-label-md text-label-md shadow-sm transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-base">refresh</span>
                <span>Try again</span>
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2.5 rounded-lg border border-border-subtle bg-surface-card hover:bg-canvas-lavender text-text-primary font-label-md text-label-md transition-all flex items-center gap-2"
              >
                <span>Reload page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
