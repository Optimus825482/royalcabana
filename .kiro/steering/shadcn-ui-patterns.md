---
inclusion: fileMatch
fileMatchPattern: "**/components/ui/**,**/components/shared/**,**/_components/**"
---

# shadcn/ui Pro — Quick Reference (March 2026)

When building UI components for this project:

- Style: `new-york` (only style — `default` deprecated), visual style: `vega`
- Component library: Radix UI (default) or Base UI — chosen at init via `npx shadcn create`
- Unified `radix-ui` package — NOT individual `@radix-ui/react-*`. Migration: `npx shadcn migrate radix`
- RTL support: logical classes (`ms-4`, `me-4`, `ps-4`, `pe-4`, `text-start`, `text-end`). Migration: `npx shadcn migrate rtl`
- Color format: OKLCH (replaces HSL) — use `bg-primary` directly, no `hsl(var(--primary))` wrapper
- Tailwind v4: CSS-first config via `@theme` directive in `globals.css`, no `tailwind.config.js`
- Use `"use client"` only on interactive components, keep pages as RSC
- Use `sonner` for toasts (`toast` component deprecated in v4)
- Use `Badge` with consistent status→variant mapping for status displays
- Use `Skeleton` for loading states, not spinners
- Use `Sheet` for mobile nav, not collapsible sidebar
- Decimal fields from Prisma serialize as strings — always `parseFloat()` before formatting
- Turkish locale: `Intl.NumberFormat("tr-TR")` for currency/numbers
- Mobile-first: `md:` and `lg:` prefixes for responsive enhancement
- Keep forms in separate client components, pages as server components
- Container queries: built-in `@container` + `@sm:`, `@md:`, `@lg:` (no plugin needed)
- 3D transforms: `perspective-*`, `rotate-x-*`, `rotate-y-*` for card effects
- `not-*` variant: `not-last:border-b`, `not-disabled:hover:bg-primary/90`
- `inert:` variant: `inert:opacity-50 inert:pointer-events-none` for modal backdrops
- Buttons use default cursor now (no `cursor-pointer` needed)

For full patterns (DataTable, Form, Modal, Layout, StatCard, ConfirmDialog, EmptyState):
Activate power `shadcn-ui-pro` via Powers panel.
