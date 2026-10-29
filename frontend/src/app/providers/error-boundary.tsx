import { Component, ReactNode, ErrorInfo } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; info: ErrorInfo | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('🔴 CRASHED IN:', error.message);
    console.error('🔴 COMPONENT STACK:', info.componentStack);
    this.setState({ error, info });
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: 'monospace', fontSize: 13, background: '#fff', minHeight: '100vh' }}>
          <h1 style={{ color: '#E3001B', fontSize: 20 }}>🚨 App Crashed</h1>
          <h2 style={{ fontSize: 14, marginTop: 20 }}>Error Message:</h2>
          <pre style={{ background: '#f5f5f5', padding: 12, borderRadius: 6, overflow: 'auto' }}>
            {this.state.error.message}
          </pre>
          <h2 style={{ fontSize: 14, marginTop: 20 }}>Component Stack (this is where it broke):</h2>
          <pre style={{ background: '#ffe5e5', padding: 12, borderRadius: 6, overflow: 'auto', fontSize: 11 }}>
            {this.state.info?.componentStack}
          </pre>
          <button
            onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.href = '/login'; }}
            style={{ marginTop: 20, padding: '10px 20px', background: '#E3001B', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer' }}
          >
            Clear Cache & Go to Login
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
