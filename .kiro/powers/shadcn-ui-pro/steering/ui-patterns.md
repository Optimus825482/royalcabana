---
inclusion: fileMatch
fileMatchPattern: "**/_components/**,**/components/shared/**,**/components/ui/**"
---

# shadcn/ui Pro — Quick Reference

When building UI components for this project:

- Style: `new-york`, icons: `lucide`, base color: `neutral`
- Use `"use client"` only on interactive components, keep pages as RSC
- Use `sonner` for toasts (not the old toast component)
- Use `Badge` with consistent status→variant mapping for status displays
- Use `Skeleton` for loading states, not spinners
- Use `Sheet` for mobile nav, not collapsible sidebar
- Decimal fields from Prisma serialize as strings — always `parseFloat()` before formatting
- Turkish locale: `Intl.NumberFormat("tr-TR")` for currency/numbers
- Mobile-first: `md:` and `lg:` prefixes for responsive enhancement
- Keep forms in separate client components, pages as server components

Refer to `.kiro/powers/shadcn-ui-pro/POWER.md` for full patterns.
