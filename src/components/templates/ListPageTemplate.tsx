"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * List/table page content: header (title + subtitle) + optional filters + content + optional pagination.
 * Use inside dashboard main. Token-based.
 */
export interface ListPageTemplateProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  subtitle?: string;
  /** Toolbar (filters, search, primary action) */
  toolbar?: React.ReactNode;
  children: React.ReactNode;
  /** Optional footer (e.g. pagination) */
  footer?: React.ReactNode;
}

export const ListPageTemplate = React.forwardRef<HTMLElement, ListPageTemplateProps>(
  function ListPageTemplate(
    { className, title, subtitle, toolbar, children, footer, ...props },
    ref
  ) {
    return (
      <section
        ref={ref as React.RefObject<HTMLDivElement>}
        className={cn("p-4 sm:p-6 max-w-6xl mx-auto space-y-4", className)}
        {...props}
      >
        <header>
          <h1 className="text-2xl font-semibold text-[var(--rc-gold)]">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-[var(--rc-text-muted)] mt-1">
              {subtitle}
            </p>
          )}
        </header>
        {toolbar && (
          <div className="flex flex-wrap items-center gap-2">
            {toolbar}
          </div>
        )}
        <div className="min-w-0">{children}</div>
        {footer && <div className="border-t border-[var(--rc-border-subtle)] pt-4">{footer}</div>}
      </section>
    );
  }
);
