---
applyTo: "src/components/**,src/app/(dashboard)/**"
---

# UI Component Kuralları

## Genel Prensipler

- **Türkçe UI, İngilizce kod:** Label/placeholder/error mesajları Türkçe, değişken/fonksiyon/dosya adları İngilizce
- Client component'lerde `"use client"` deklarasyonu zorunlu
- Server component tercih et, sadece interaktivite gerektiğinde client component yap

## Component Kütüphanesi

- shadcn/ui bileşenleri: `@/components/ui/` (button, dialog, table, form, dropdown-menu vb.)
- Proje özel bileşenler: `@/components/` (calendar, map, products, reports, shared, three)
- shadcn/ui eklerken: `npx shadcn-ui@latest add <component-name>`

## Stil Kuralları

- Tailwind CSS kullan, inline style YASAK
- Responsive tasarım: mobile-first yaklaşım
- Dark mode desteği: `dark:` prefix kullan

## Form Pattern'leri

- React Hook Form + Zod validation
- Error mesajları Türkçe gösterilmeli
- Loading state'lerde button disabled + spinner

## Data Fetching (Dashboard Sayfaları)

- Server component'lerde direkt Prisma çağrısı yapılabilir
- Client component'lerde API route'ları kullan (`fetch('/api/...')`)
- Loading state için `loading.tsx` dosyası kullan (Suspense boundary)

## Rol Tabanlı UI

- Roller: SYSTEM_ADMIN, ADMIN, CASINO_USER, FNB_USER
- Yetkisiz bileşenleri gizle, sadece disable etme
- `session.user.role` ile kontrol et

## Önemli Dosyalar

- Dashboard layout: `src/app/(dashboard)/layout.tsx`
- Global styles: `src/app/globals.css`
- Shared components: `src/components/shared/`
