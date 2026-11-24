import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('App ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="safe-area-shell w-full felt-table-surface mahogany-frame flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-[#0B2C21] border-2 border-[#D4A243]/55 rounded-2xl p-6 text-center flex flex-col gap-4 shadow-2xl">
            <h1 className="font-display text-2xl font-bold text-[#FAF5EA]">
              هەڵەیەکی چاوەڕواننەکراو ڕوویدا
            </h1>
            <p className="text-sm text-[#CBE0D3] leading-relaxed">
              تکایە پەڕەکە نوێ بکەرەوە تا یارییەکە بە تەواوی کار بکاتەوە.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-[46px] px-6 py-2.5 rounded-xl bg-[#D4A243] hover:bg-[#E2B55A] text-[#17120A] font-extrabold text-sm cursor-pointer"
            >
              نوێکردنەوەی پەڕە
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
