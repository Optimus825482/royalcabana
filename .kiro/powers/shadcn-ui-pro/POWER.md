---
name: "shadcn-ui-pro"
displayName: "shadcn/ui Pro Patterns"
description: "Professional UI patterns with shadcn/ui new-york style for dashboard applications. Data tables, forms, modals, responsive layouts, and theming patterns."
keywords:
  ["shadcn", "ui-component", "dashboard-layout", "data-table", "form-pattern"]
author: "Erkan"
---

# shadcn/ui Pro Patterns

## Overview

This power provides production-ready UI patterns for building professional dashboard interfaces using shadcn/ui (new-york style) with Tailwind CSS. It covers data tables with sorting/filtering/pagination, form patterns with Zod validation, modal dialogs, responsive sidebar layouts, and consistent theming.

The patterns are designed for Next.js 15 App Router with RSC (React Server Components) support, TypeScript strict mode, and Lucide icons.

## Configuration Reference

This project uses shadcn/ui with:

- Style: `new-york`
- RSC: `true`
- Icon library: `lucide`
- Base color: `neutral`
- CSS variables: `true`
- Aliases: `@/components/ui`, `@/lib/utils`, `@/hooks`

## Component Installation

```bash
# Install components as needed
npx shadcn@latest add button card dialog table input label select textarea badge separator sheet tabs tooltip dropdown-menu command popover calendar form toast sonner data-table
```

## Data Table Pattern

The most common UI element in dashboard apps. Use `@tanstack/react-table` with shadcn.

### Server-Side Data Table with Pagination

```tsx
// components/shared/data-table.tsx
"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  pageCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageCount,
  page,
  pageSize,
  onPageChange,
}: DataTableProps<TData, TValue>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount,
  });

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Kayıt bulunamadı.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-muted-foreground">
          Sayfa {page} / {pageCount}
        </p>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### Column Definition Pattern with Actions

```tsx
// Example: columns for a reservations table
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Trash2 } from "lucide-react";

// Status badge color mapping
const statusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  APPROVED: "default",
  PENDING: "secondary",
  REJECTED: "destructive",
  CANCELLED: "outline",
};

export const columns: ColumnDef<Reservation>[] = [
  {
    accessorKey: "guestName",
    header: "Misafir",
  },
  {
    accessorKey: "cabana.name",
    header: "Cabana",
  },
  {
    accessorKey: "startDate",
    header: "Tarih",
    cell: ({ row }) => {
      const start = new Date(row.original.startDate);
      const end = new Date(row.original.endDate);
      return `${start.toLocaleDateString("tr-TR")} - ${end.toLocaleDateString("tr-TR")}`;
    },
  },
  {
    accessorKey: "status",
    header: "Durum",
    cell: ({ row }) => (
      <Badge variant={statusVariant[row.original.status] ?? "outline"}>
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "totalPrice",
    header: "Tutar",
    cell: ({ row }) => {
      const price = parseFloat(row.original.totalPrice ?? "0");
      return new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
      }).format(price);
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <Eye className="mr-2 h-4 w-4" />
            Görüntüle
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Edit className="mr-2 h-4 w-4" />
            Düzenle
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Sil
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
];
```

## Form Pattern with Zod + React Hook Form

```tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(2, "En az 2 karakter"),
  email: z.string().email("Geçerli e-posta giriniz"),
  role: z.enum(["ADMIN", "MANAGER", "STAFF", "CASHIER"]),
});

type FormValues = z.infer<typeof formSchema>;

export function UserForm({ onSuccess }: { onSuccess?: () => void }) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "", role: "STAFF" },
  });

  async function onSubmit(values: FormValues) {
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      toast.success("Kullanıcı oluşturuldu");
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bir hata oluştu");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ad Soyad</FormLabel>
              <FormControl>
                <Input placeholder="Ad Soyad" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-posta</FormLabel>
              <FormControl>
                <Input type="email" placeholder="ornek@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rol</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MANAGER">Yönetici</SelectItem>
                  <SelectItem value="STAFF">Personel</SelectItem>
                  <SelectItem value="CASHIER">Kasiyer</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </form>
    </Form>
  );
}
```

## Modal Dialog Pattern

```tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function CreateModal({
  title,
  description,
  children,
  trigger,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {title}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {typeof children === "function"
          ? (children as (close: () => void) => React.ReactNode)(() =>
              setOpen(false),
            )
          : children}
      </DialogContent>
    </Dialog>
  );
}
```

## Confirmation Dialog (Delete/Deactivate)

```tsx
"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function ConfirmDialog({
  title = "Emin misiniz?",
  description = "Bu işlem geri alınamaz.",
  onConfirm,
  variant = "destructive",
  trigger,
}: {
  title?: string;
  description?: string;
  onConfirm: () => void | Promise<void>;
  variant?: "destructive" | "default";
  trigger?: React.ReactNode;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>İptal</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              variant === "destructive"
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : ""
            }
          >
            Onayla
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

## Page Layout Pattern

### Dashboard Page with Header + Actions + Table

```tsx
// Standard page layout for all dashboard pages
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rezervasyonlar</h1>
          <p className="text-muted-foreground">Tüm rezervasyonları yönetin</p>
        </div>
        <CreateModal title="Yeni Rezervasyon">
          <ReservationForm />
        </CreateModal>
      </div>

      {/* Stats Cards Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Toplam" value="128" icon={Calendar} />
        <StatCard title="Bekleyen" value="12" icon={Clock} />
        <StatCard title="Onaylanan" value="96" icon={CheckCircle} />
        <StatCard title="Bugün" value="8" icon={Sun} />
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Rezervasyon Listesi</CardTitle>
            <SearchInput placeholder="Misafir ara..." />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} ... />
        </CardContent>
      </Card>
    </div>
  );
}
```

### Stat Card Component

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
```

## Responsive Sidebar Layout

```tsx
// Use Sheet for mobile, fixed sidebar for desktop
"use client";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 border-r bg-card lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <Sheet>
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:hidden">
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <span className="font-semibold">Royal Cabana</span>
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </div>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>
    </div>
  );
}
```

## Decimal/Currency Display Helper

Prisma Decimal fields serialize as strings. Always use this pattern:

```tsx
// lib/format.ts
export function formatCurrency(
  value: string | number | null | undefined,
): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(num);
}

// Usage in components
<span>{formatCurrency(reservation.totalPrice)}</span>;
```

## Loading & Empty States

```tsx
// Skeleton loading for tables
import { Skeleton } from "@/components/ui/skeleton";

export function TableSkeleton({
  rows = 5,
  cols = 4,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {Array.from({ length: cols }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-4 w-24" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: cols }).map((_, j) => (
                <TableCell key={j}>
                  <Skeleton className="h-4 w-full" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// Empty state
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="h-12 w-12 text-muted-foreground/50" />
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

## Best Practices

- Always use `"use client"` only on interactive components, keep pages as RSC
- Use `sonner` for toast notifications (not the old toast component)
- Prefer `variant="ghost"` for icon-only buttons
- Use `Badge` for status displays with consistent color mapping
- Always handle Decimal→string conversion from Prisma with `parseFloat()`
- Use `Skeleton` components for loading states, not spinners
- Mobile-first: design for mobile, enhance for desktop with `md:` and `lg:` prefixes
- Use `Sheet` for mobile navigation, not a collapsible sidebar
- Keep forms in separate client components, pages as server components
- Use `Intl.NumberFormat("tr-TR")` for Turkish locale formatting
