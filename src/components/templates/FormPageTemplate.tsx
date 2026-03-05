"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Form page content: header (title + subtitle) + form area.
 * Use inside dashboard main. Token-based text colors.
 */
export interface FormPageTemplateProps extends React.HTMLAttributes<HTMLElement> {
  title: string;
  subtitle?: string;
  /** Optional actions (e.g. secondary button) next to title */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export const FormPageTemplate = React.forwardRef<HTMLElement, FormPageTemplateProps>(
  function FormPageTemplate(
    { className, title, subtitle, actions, children, ...props },
    ref
  ) {
    return (
      <section
        ref={ref as React.RefObject<HTMLDivElement>}
        className={cn("p-4 sm:p-6 max-w-4xl mx-auto space-y-6", className)}
        {...props}
      >
        <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--rc-gold)]">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-[var(--rc-text-muted)] mt-1">
                {subtitle}
              </p>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 mt-2 sm:mt-0">{actions}</div>}
        </header>
        <div className="space-y-6">{children}</div>
      </section>
    );
  }
);
