"use client";

import type { ReactNode } from "react";
import { Component } from "react";

type Props = {
  children: ReactNode;
  title?: string;
  description?: string;
};

type State = {
  hasError: boolean;
};

export class MarketingErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Marketing section crashed", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 px-5 py-6 text-sm leading-6 text-amber-900 shadow-lg shadow-amber-100/50">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
            Temporary rendering issue
          </p>
          <p className="mt-3 text-lg font-semibold text-slate-950">
            {this.props.title || "This section could not finish loading."}
          </p>
          <p className="mt-2">
            {this.props.description
              || "Reload the page or continue browsing other sections while we recover the broken client component."}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
