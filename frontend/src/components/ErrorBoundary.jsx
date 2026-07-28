import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught an error:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
          <div className="max-w-md text-center">
            <p className="text-white font-medium mb-2">Something went wrong</p>
            <p className="text-slate-400 text-sm mb-6">
              We hit an unexpected error. Your progress up to this point should be saved. Try
              going back to your dashboard.
            </p>
            <button
              onClick={this.handleReload}
              className="px-5 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold transition"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;