---
name: "tailwind-ui-patterns"
displayName: "Tailwind UI Patterns"
description: "Framework-agnostic UI patterns with Tailwind CSS. Responsive layouts, component patterns, dark mode, animations, and design tokens for any project."
keywords:
  ["tailwind", "css", "responsive", "dark-mode", "ui-layout", "design-tokens"]
author: "Erkan"
---

# Tailwind UI Patterns

## Overview

Production-ready UI patterns using Tailwind CSS v4 that work in any framework — React, Vue, Svelte, Astro, vanilla HTML. Covers responsive layouts, component patterns, dark mode, animations, design tokens, and accessibility. Framework-agnostic: pure HTML + Tailwind classes.

Tailwind CSS v4 (released January 2025) is a ground-up rewrite powered by the Oxide engine — a new Rust-based compiler delivering 5x faster full builds (~120ms), 6x faster incremental rebuilds (~15ms), and near-instant HMR updates. The architecture shift: native CSS parsing, parallel processing, zero-runtime JavaScript. The biggest developer-facing change: CSS-first configuration via `@theme` replaces `tailwind.config.js`. New directives (`@theme`, `@source`, `@import`, `@utility`, `@variant`), OKLCH color space, native container queries, 3D transforms, `not-*` variant, `inert:` variant, expanded gradient APIs, and `@starting-style` entry animations are all built-in.

---

## Tailwind v4 Oxide Engine

### Performance Gains

| Metric              | v3         | v4 (Oxide)   | Improvement |
| ------------------- | ---------- | ------------ | ----------- |
| Full build          | ~600ms     | ~120ms       | 5x faster   |
| Incremental rebuild | ~100ms     | ~15ms        | 6x faster   |
| HMR update          | Noticeable | Near-instant | —           |
| Runtime JS          | Required   | Zero         | Eliminated  |

The Oxide engine uses native CSS parsing and parallel processing. No JavaScript runtime is involved in the compilation pipeline — everything happens at the Rust layer.

### Installation

```bash
# New project — Vite (recommended)
npm install tailwindcss @tailwindcss/vite

# New project — PostCSS
npm install tailwindcss @tailwindcss/postcss

# CLI standalone
npm install tailwindcss @tailwindcss/cli
```

**Vite plugin** (vite.config.ts):

```ts
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss()],
});
```

**PostCSS plugin** (postcss.config.mjs):

```js
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

---

## Tailwind v4 CSS-First Configuration

### Zero-Config Setup

```css
/* globals.css — single import, that's it */
@import "tailwindcss";
```

Tailwind v4 auto-detects your source files. No `content` array needed in most cases. Automatic content detection scans your project for template files and extracts classes.

### Full Configuration with @theme

```css
/* globals.css — Tailwind v4 CSS-first config */
@import "tailwindcss";

@theme {
  /* Colors */
  --color-background: #ffffff;
  --color-foreground: #0a0a0a;
  --color-card: #ffffff;
  --color-card-foreground: #0a0a0a;
  --color-primary: #171717;
  --color-primary-foreground: #fafafa;
  --color-secondary: #f5f5f5;
  --color-secondary-foreground: #171717;
  --color-muted: #f5f5f5;
  --color-muted-foreground: #737373;
  --color-accent: #f5f5f5;
  --color-accent-foreground: #171717;
  --color-destructive: #ef4444;
  --color-destructive-foreground: #fafafa;
  --color-border: #e5e5e5;
  --color-input: #e5e5e5;
  --color-ring: #0a0a0a;

  /* Radius */
  --radius-sm: 0.125rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;

  /* Fonts */
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  /* Custom animations */
  --animate-slide-down: slide-down 0.2s ease-out;
  --animate-fade-in: fade-in 0.3s ease-out;
  --animate-spin-slow: spin 3s linear infinite;

  @keyframes slide-down {
    from {
      height: 0;
      opacity: 0;
    }
    to {
      height: var(--radix-accordion-content-height);
      opacity: 1;
    }
  }
  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}

/* Dark mode — class-based override */
.dark {
  --color-background: #0a0a0a;
  --color-foreground: #fafafa;
  --color-card: #0a0a0a;
  --color-card-foreground: #fafafa;
  --color-primary: #fafafa;
  --color-primary-foreground: #171717;
  --color-secondary: #262626;
  --color-secondary-foreground: #fafafa;
  --color-muted: #262626;
  --color-muted-foreground: #a3a3a3;
  --color-accent: #262626;
  --color-accent-foreground: #fafafa;
  --color-destructive: #7f1d1d;
  --color-destructive-foreground: #fafafa;
  --color-border: #262626;
  --color-input: #262626;
  --color-ring: #d4d4d4;
}
```

### OKLCH Color Tokens (Advanced)

```css
@theme {
  /* OKLCH provides perceptually uniform color manipulation */
  --color-primary: oklch(0.21 0.034 264.66);
  --color-primary-foreground: oklch(0.98 0.005 264.66);
  --color-secondary: oklch(0.96 0.005 264.66);
  --color-secondary-foreground: oklch(0.21 0.034 264.66);
  --color-destructive: oklch(0.58 0.22 27.33);
  --color-success: oklch(0.72 0.19 142);
  --color-warning: oklch(0.8 0.15 85);
  --color-info: oklch(0.7 0.15 250);
}
```

### Source Paths and Legacy Config

```css
/* Explicit source paths (replaces content array) */
@source "../src/**/*.{ts,tsx,html,vue,svelte}";

/* If you still need a legacy config file */
@config "../tailwind.config.js";
```

### Custom Utilities and Variants

```css
/* Define custom utilities */
@utility text-balance {
  text-wrap: balance;
}

@utility scrollbar-hidden {
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}

/* Define custom variants */
@variant hocus (&:hover, &:focus-visible);
@variant theme-dark (.dark &);
@variant not-last (&:not(:last-child));
```

---

## Migration from v3 to v4

### Quick Migration

```bash
# Automated migration tool
npx @tailwindcss/upgrade
```

### Migration Reference

| v3 (Old)                              | v4 (New)                                    |
| ------------------------------------- | ------------------------------------------- |
| `tailwind.config.js` theme            | `@theme { }` in CSS                         |
| `content: [...]`                      | `@source "..."` or auto-detection           |
| `@tailwind base/components/utilities` | `@import "tailwindcss"`                     |
| `tailwindcss` PostCSS plugin          | `@tailwindcss/postcss` plugin               |
| HSL `hsl(var(--primary))`             | OKLCH `oklch(...)` or hex/rgb               |
| `ring-offset-*` utilities             | `ring-*` (simplified)                       |
| `bg-opacity-*`                        | `bg-primary/50` (modifier syntax)           |
| `tailwind.config.js` keyframes        | `@keyframes` inside `@theme { }`            |
| Plugin-based container queries        | Built-in `@container` + `@sm:`, `@lg:` etc. |
| `darkMode: 'class'` in config         | Class strategy is default, no config needed |
| No 3D transforms                      | `rotate-x-*`, `rotate-y-*`, `perspective-*` |
| No `not-*` variant                    | Built-in `not-*` variant                    |
| No `inert:` variant                   | Built-in `inert:` variant                   |

Key migration notes:

- `@apply` still works but prefer utility classes in markup
- Most v3 utility classes work unchanged in v4
- CSS variables now use `--color-*` namespace inside `@theme`
- Plugins that extend theme should migrate to `@theme` or `@utility`
- `@tailwindcss/upgrade` automates renaming, config migration, and PostCSS plugin swap

---

## Tailwind v4 Features

### Container Queries (Built-in, No Plugin)

```html
<!-- Parent defines the container -->
<div class="@container">
  <div class="flex flex-col @md:flex-row @lg:grid @lg:grid-cols-3 gap-4">
    <!-- Responds to container size, not viewport -->
    <div class="p-4 @md:p-6 @lg:p-8">Responsive to parent</div>
  </div>
</div>

<!-- Named containers -->
<div class="@container/sidebar">
  <div class="hidden @sm/sidebar:flex @sm/sidebar:items-center gap-2">
    <span>Visible when sidebar is wide enough</span>
  </div>
</div>

<!-- Container query breakpoints -->
<!-- @xs: 20rem, @sm: 24rem, @md: 28rem, @lg: 32rem -->
<!-- @xl: 36rem, @2xl: 42rem, @3xl: 48rem -->
```

### 3D Transform Utilities

```html
<!-- Perspective container -->
<div class="perspective-500">
  <div class="rotate-y-12 hover:rotate-y-0 transition-transform duration-300">
    3D Card Effect
  </div>
</div>

<!-- Card flip animation -->
<div class="perspective-800 group">
  <div
    class="relative preserve-3d transition-transform duration-500 group-hover:rotate-y-180"
  >
    <!-- Front face -->
    <div
      class="absolute inset-0 backface-hidden rounded-lg bg-card p-6 shadow-md"
    >
      <h3 class="text-lg font-semibold">Front Side</h3>
    </div>
    <!-- Back face -->
    <div
      class="absolute inset-0 backface-hidden rotate-y-180 rounded-lg bg-primary p-6 text-primary-foreground shadow-md"
    >
      <h3 class="text-lg font-semibold">Back Side</h3>
    </div>
  </div>
</div>

<!-- Tilt on hover -->
<div class="perspective-1000">
  <div
    class="rotate-x-2 rotate-y-3 hover:rotate-x-0 hover:rotate-y-0 transition-transform duration-200"
  >
    Subtle tilt effect
  </div>
</div>
```

### Expanded Gradient APIs

```html
<!-- Radial gradient -->
<div class="bg-radial-[at_50%_0%] from-primary/20 to-transparent h-64">
  Radial gradient from top center
</div>

<!-- Conic gradient -->
<div
  class="bg-conic from-primary via-secondary to-primary rounded-full h-32 w-32"
>
  Conic gradient spinner
</div>

<!-- Gradient with OKLCH interpolation -->
<div class="bg-linear-to-r/oklch from-blue-500 to-green-500">
  OKLCH interpolation for smoother gradients
</div>
```

### not-\* Variant

```html
<!-- Style all items except the last -->
<ul>
  <li class="not-last:border-b not-last:pb-4">Item 1</li>
  <li class="not-last:border-b not-last:pb-4">Item 2</li>
  <li class="not-last:border-b not-last:pb-4">Item 3</li>
</ul>

<!-- Negate states -->
<button class="not-disabled:hover:bg-primary/90 disabled:opacity-50">
  Submit
</button>

<!-- Negate selectors -->
<div class="not-first:mt-4">Margin top except first child</div>
```

### inert: Variant

```html
<!-- Style inert elements (non-interactive overlaid content) -->
<div class="inert:opacity-50 inert:pointer-events-none" inert>
  <p>This content is inert — not focusable or clickable</p>
  <button>Cannot be clicked</button>
</div>

<!-- Modal backdrop pattern -->
<main class="inert:blur-sm inert:scale-[0.98] transition-all" id="main-content">
  Page content blurs when modal is open
</main>
```

### color-mix() Support

```html
<!-- Mix colors for hover states -->
<button
  class="bg-primary hover:bg-[color-mix(in_oklch,var(--color-primary)_85%,black)]"
>
  Darken on hover
</button>

<!-- Semi-transparent overlays -->
<div class="bg-[color-mix(in_srgb,var(--color-primary)_20%,transparent)]">
  20% primary overlay
</div>
```

### CSS Cascade Layers

Tailwind v4 uses `@layer` internally for proper cascade ordering:

```
@layer theme      → Design tokens, CSS variables
@layer base       → Reset, element defaults
@layer components → Reusable component classes
@layer utilities  → Utility classes (highest priority)
```

Custom component styles integrate naturally:

```css
@layer components {
  .btn-primary {
    @apply rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground;
  }
}
```

---

## Layout Patterns

### Dashboard Shell

```html
<div class="flex h-screen bg-background text-foreground">
  <!-- Sidebar -->
  <aside class="hidden w-64 shrink-0 border-r border-border bg-card lg:block">
    <div class="flex h-16 items-center border-b border-border px-6">
      <span class="text-lg font-bold">AppName</span>
    </div>
    <nav class="space-y-1 p-4" aria-label="Main navigation">
      <a
        href="#"
        class="flex items-center gap-3 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-foreground"
        aria-current="page"
      >
        Dashboard
      </a>
      <a
        href="#"
        class="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        Settings
      </a>
    </nav>
  </aside>

  <!-- Main content -->
  <div class="flex flex-1 flex-col overflow-hidden">
    <!-- Top bar -->
    <header
      class="flex h-16 items-center justify-between border-b border-border bg-card px-6"
    >
      <button class="lg:hidden" aria-label="Toggle menu">
        <svg
          class="h-6 w-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>
      <div class="flex items-center gap-4">
        <span class="text-sm text-muted-foreground">user@example.com</span>
      </div>
    </header>

    <!-- Page content -->
    <main class="flex-1 overflow-y-auto p-6">
      <div class="mx-auto max-w-7xl">
        <!-- Page content here -->
      </div>
    </main>
  </div>
</div>
```

### Responsive Grid

```html
<!-- Auto-fit grid — cards fill available space -->
<div class="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
  <div class="rounded-lg border border-border bg-card p-6">Card 1</div>
  <div class="rounded-lg border border-border bg-card p-6">Card 2</div>
  <div class="rounded-lg border border-border bg-card p-6">Card 3</div>
  <div class="rounded-lg border border-border bg-card p-6">Card 4</div>
</div>

<!-- Breakpoint-based grid -->
<div
  class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
>
  <div class="rounded-lg border border-border bg-card p-6">Card</div>
</div>

<!-- Container query grid — responds to parent, not viewport -->
<div class="@container">
  <div
    class="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3 @xl:grid-cols-4 gap-6"
  >
    <div class="rounded-lg border border-border bg-card p-6">Card</div>
  </div>
</div>
```

### Container Pattern

```html
<!-- Centered container with responsive padding -->
<div class="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">Content</div>

<!-- Narrow container for text content -->
<div class="mx-auto max-w-prose px-4">
  <p class="text-balance text-muted-foreground">Long-form text content</p>
</div>

<!-- Full-bleed with contained content -->
<section class="bg-muted py-16">
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    Content within full-width background
  </div>
</section>
```

### Sticky Header + Scrollable Content

```html
<div class="flex h-screen flex-col">
  <!-- Sticky header -->
  <header
    class="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm"
  >
    <div class="mx-auto flex h-16 max-w-7xl items-center px-4">
      <span class="font-bold">Logo</span>
    </div>
  </header>

  <!-- Scrollable content -->
  <main class="flex-1 overflow-y-auto">
    <div class="mx-auto max-w-7xl p-6">Content</div>
  </main>
</div>
```

### Holy Grail Layout

```html
<div class="flex min-h-screen flex-col">
  <header class="border-b border-border bg-card px-6 py-4">Header</header>

  <div class="flex flex-1">
    <aside class="hidden w-64 border-r border-border bg-card p-4 md:block">
      Sidebar
    </aside>
    <main class="flex-1 p-6">Main Content</main>
    <aside class="hidden w-64 border-l border-border bg-card p-4 xl:block">
      Right Panel
    </aside>
  </div>

  <footer class="border-t border-border bg-card px-6 py-4">Footer</footer>
</div>
```

---

## Component Patterns

### Card

```html
<!-- Standard card -->
<div class="rounded-lg border border-border bg-card p-6 shadow-sm">
  <h3 class="text-lg font-semibold text-card-foreground">Card Title</h3>
  <p class="mt-2 text-sm text-muted-foreground">
    Card description text goes here.
  </p>
  <div class="mt-4 flex gap-2">
    <button
      class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
    >
      Action
    </button>
    <button
      class="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
    >
      Cancel
    </button>
  </div>
</div>

<!-- Interactive card with hover -->
<a
  href="#"
  class="group block rounded-lg border border-border bg-card p-6 shadow-sm transition-all hover:border-ring hover:shadow-md"
>
  <h3 class="font-semibold text-card-foreground group-hover:text-primary">
    Clickable Card
  </h3>
  <p class="mt-2 text-sm text-muted-foreground">Entire card is clickable.</p>
</a>

<!-- Card with 3D hover effect -->
<div class="perspective-800">
  <div
    class="rounded-lg border border-border bg-card p-6 shadow-sm transition-transform duration-300 hover:rotate-y-2 hover:shadow-lg"
  >
    <h3 class="font-semibold text-card-foreground">3D Card</h3>
    <p class="mt-2 text-sm text-muted-foreground">Subtle 3D tilt on hover.</p>
  </div>
</div>

<!-- Card with container query -->
<div class="@container">
  <div
    class="flex flex-col @sm:flex-row rounded-lg border border-border bg-card shadow-sm"
  >
    <div
      class="h-48 @sm:h-auto @sm:w-48 shrink-0 rounded-t-lg @sm:rounded-l-lg @sm:rounded-tr-none bg-muted"
    ></div>
    <div class="p-6">
      <h3 class="font-semibold text-card-foreground">Responsive Card</h3>
      <p class="mt-2 text-sm text-muted-foreground">
        Stacks vertically in narrow containers, horizontal in wide ones.
      </p>
    </div>
  </div>
</div>
```

### Badge

```html
<span
  class="inline-flex items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground"
>
  Default
</span>
<span
  class="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
>
  Secondary
</span>
<span
  class="inline-flex items-center rounded-full bg-destructive px-2.5 py-0.5 text-xs font-medium text-destructive-foreground"
>
  Destructive
</span>
<span
  class="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-foreground"
>
  Outline
</span>
```

### Button

```html
<!-- Primary -->
<button
  class="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
>
  Primary
</button>

<!-- Secondary -->
<button
  class="inline-flex items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
>
  Secondary
</button>

<!-- Destructive -->
<button
  class="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
>
  Delete
</button>

<!-- Ghost -->
<button
  class="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
>
  Ghost
</button>

<!-- Outline -->
<button
  class="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
>
  Outline
</button>

<!-- Icon button -->
<button
  class="inline-flex h-10 w-10 items-center justify-center rounded-md border border-input bg-background transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
  aria-label="Settings"
>
  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
    />
  </svg>
</button>

<!-- Loading state -->
<button
  class="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
  disabled
>
  <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle
      class="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      stroke-width="4"
    />
    <path
      class="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
  Loading...
</button>
```

### Form Elements

```html
<!-- Text input -->
<div class="space-y-2">
  <label for="email" class="text-sm font-medium text-foreground">Email</label>
  <input
    id="email"
    type="email"
    placeholder="name@example.com"
    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
  />
</div>

<!-- Input with error -->
<div class="space-y-2">
  <label for="password" class="text-sm font-medium text-foreground"
    >Password</label
  >
  <input
    id="password"
    type="password"
    aria-invalid="true"
    aria-describedby="password-error"
    class="flex h-10 w-full rounded-md border border-destructive bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
  />
  <p id="password-error" class="text-sm text-destructive" role="alert">
    Password must be at least 8 characters.
  </p>
</div>

<!-- Select -->
<div class="space-y-2">
  <label for="role" class="text-sm font-medium text-foreground">Role</label>
  <select
    id="role"
    class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
  >
    <option value="">Select a role</option>
    <option value="admin">Admin</option>
    <option value="user">User</option>
  </select>
</div>

<!-- Textarea -->
<div class="space-y-2">
  <label for="message" class="text-sm font-medium text-foreground"
    >Message</label
  >
  <textarea
    id="message"
    rows="4"
    placeholder="Type your message..."
    class="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
  ></textarea>
</div>

<!-- Checkbox -->
<div class="flex items-center gap-2">
  <input
    id="terms"
    type="checkbox"
    class="h-4 w-4 rounded border-input text-primary accent-primary focus:ring-ring"
  />
  <label for="terms" class="text-sm text-foreground"
    >Accept terms and conditions</label
  >
</div>
```

### Table

```html
<div class="w-full overflow-x-auto rounded-lg border border-border">
  <table class="w-full text-sm" role="table">
    <thead>
      <tr class="border-b border-border bg-muted/50">
        <th
          class="px-4 py-3 text-left font-medium text-muted-foreground"
          scope="col"
        >
          Name
        </th>
        <th
          class="px-4 py-3 text-left font-medium text-muted-foreground"
          scope="col"
        >
          Status
        </th>
        <th
          class="px-4 py-3 text-left font-medium text-muted-foreground"
          scope="col"
        >
          Role
        </th>
        <th
          class="px-4 py-3 text-right font-medium text-muted-foreground"
          scope="col"
        >
          Actions
        </th>
      </tr>
    </thead>
    <tbody>
      <tr class="border-b border-border transition-colors hover:bg-muted/50">
        <td class="px-4 py-3 font-medium text-foreground">John Doe</td>
        <td class="px-4 py-3">
          <span
            class="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600"
            >Active</span
          >
        </td>
        <td class="px-4 py-3 text-muted-foreground">Admin</td>
        <td class="px-4 py-3 text-right">
          <button class="text-sm text-primary hover:underline">Edit</button>
        </td>
      </tr>
      <tr class="border-b border-border transition-colors hover:bg-muted/50">
        <td class="px-4 py-3 font-medium text-foreground">Jane Smith</td>
        <td class="px-4 py-3">
          <span
            class="inline-flex items-center rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-600"
            >Pending</span
          >
        </td>
        <td class="px-4 py-3 text-muted-foreground">User</td>
        <td class="px-4 py-3 text-right">
          <button class="text-sm text-primary hover:underline">Edit</button>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### Modal / Dialog

```html
<!-- Backdrop -->
<div
  class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
  aria-hidden="true"
></div>

<!-- Dialog -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center p-4"
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
>
  <div
    class="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-lg animate-fade-in"
  >
    <h2 id="dialog-title" class="text-lg font-semibold text-card-foreground">
      Confirm Action
    </h2>
    <p class="mt-2 text-sm text-muted-foreground">
      Are you sure you want to proceed? This action cannot be undone.
    </p>
    <div class="mt-6 flex justify-end gap-2">
      <button
        class="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
      >
        Cancel
      </button>
      <button
        class="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
      >
        Delete
      </button>
    </div>
  </div>
</div>
```

### Toast / Notification

```html
<!-- Toast container — fixed bottom-right -->
<div class="fixed bottom-4 right-4 z-50 flex flex-col gap-2" aria-live="polite">
  <!-- Success toast -->
  <div
    class="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-lg animate-fade-in"
    role="status"
  >
    <svg
      class="h-5 w-5 shrink-0 text-green-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M5 13l4 4L19 7"
      />
    </svg>
    <p class="text-sm font-medium text-card-foreground">
      Changes saved successfully.
    </p>
    <button
      class="ml-auto shrink-0 text-muted-foreground hover:text-foreground"
      aria-label="Dismiss"
    >
      <svg
        class="h-4 w-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  </div>
</div>
```

### Navigation

```html
<!-- Responsive navbar -->
<nav class="border-b border-border bg-card" aria-label="Main navigation">
  <div
    class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
  >
    <a href="/" class="text-lg font-bold text-foreground">Brand</a>

    <!-- Desktop nav -->
    <div class="hidden items-center gap-6 md:flex">
      <a href="#" class="text-sm font-medium text-foreground hover:text-primary"
        >Home</a
      >
      <a href="#" class="text-sm text-muted-foreground hover:text-foreground"
        >Features</a
      >
      <a href="#" class="text-sm text-muted-foreground hover:text-foreground"
        >Pricing</a
      >
      <button
        class="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Sign Up
      </button>
    </div>

    <!-- Mobile menu button -->
    <button class="md:hidden" aria-label="Toggle menu" aria-expanded="false">
      <svg
        class="h-6 w-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M4 6h16M4 12h16M4 18h16"
        />
      </svg>
    </button>
  </div>

  <!-- Mobile menu (toggle visibility with JS) -->
  <div class="hidden border-t border-border md:hidden" id="mobile-menu">
    <div class="space-y-1 px-4 py-3">
      <a
        href="#"
        class="block rounded-md px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
        >Home</a
      >
      <a
        href="#"
        class="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >Features</a
      >
      <a
        href="#"
        class="block rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >Pricing</a
      >
    </div>
  </div>
</nav>
```

### Breadcrumb

```html
<nav aria-label="Breadcrumb">
  <ol class="flex items-center gap-1.5 text-sm">
    <li>
      <a href="#" class="text-muted-foreground hover:text-foreground">Home</a>
    </li>
    <li class="text-muted-foreground">/</li>
    <li>
      <a href="#" class="text-muted-foreground hover:text-foreground"
        >Products</a
      >
    </li>
    <li class="text-muted-foreground">/</li>
    <li class="font-medium text-foreground" aria-current="page">Details</li>
  </ol>
</nav>
```

### Tabs

```html
<div role="tablist" class="flex border-b border-border">
  <button
    role="tab"
    aria-selected="true"
    class="border-b-2 border-primary px-4 py-2 text-sm font-medium text-foreground"
  >
    General
  </button>
  <button
    role="tab"
    aria-selected="false"
    class="border-b-2 border-transparent px-4 py-2 text-sm text-muted-foreground hover:border-border hover:text-foreground"
  >
    Security
  </button>
  <button
    role="tab"
    aria-selected="false"
    class="border-b-2 border-transparent px-4 py-2 text-sm text-muted-foreground hover:border-border hover:text-foreground"
  >
    Notifications
  </button>
</div>
<div role="tabpanel" class="p-4">Tab content here</div>
```

### Avatar

```html
<!-- Image avatar -->
<img
  src="/avatar.jpg"
  alt="User Name"
  class="h-10 w-10 rounded-full object-cover ring-2 ring-background"
/>

<!-- Fallback avatar -->
<div
  class="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground"
>
  JD
</div>

<!-- Avatar group -->
<div class="flex -space-x-3">
  <img
    src="/avatar1.jpg"
    alt="User 1"
    class="h-8 w-8 rounded-full ring-2 ring-background"
  />
  <img
    src="/avatar2.jpg"
    alt="User 2"
    class="h-8 w-8 rounded-full ring-2 ring-background"
  />
  <img
    src="/avatar3.jpg"
    alt="User 3"
    class="h-8 w-8 rounded-full ring-2 ring-background"
  />
  <div
    class="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground ring-2 ring-background"
  >
    +5
  </div>
</div>
```

### Skeleton Loader

```html
<!-- Card skeleton -->
<div class="rounded-lg border border-border bg-card p-6">
  <div class="h-4 w-3/4 animate-pulse rounded bg-muted"></div>
  <div class="mt-3 h-3 w-full animate-pulse rounded bg-muted"></div>
  <div class="mt-2 h-3 w-5/6 animate-pulse rounded bg-muted"></div>
  <div class="mt-4 flex gap-2">
    <div class="h-9 w-20 animate-pulse rounded-md bg-muted"></div>
    <div class="h-9 w-20 animate-pulse rounded-md bg-muted"></div>
  </div>
</div>

<!-- Table row skeleton -->
<div class="flex items-center gap-4 border-b border-border px-4 py-3">
  <div class="h-8 w-8 animate-pulse rounded-full bg-muted"></div>
  <div class="flex-1 space-y-2">
    <div class="h-3 w-1/3 animate-pulse rounded bg-muted"></div>
    <div class="h-3 w-1/4 animate-pulse rounded bg-muted"></div>
  </div>
  <div class="h-6 w-16 animate-pulse rounded-full bg-muted"></div>
</div>
```

### Empty State

```html
<div class="flex flex-col items-center justify-center py-16 text-center">
  <svg
    class="h-12 w-12 text-muted-foreground/50"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.5"
      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
    />
  </svg>
  <h3 class="mt-4 text-lg font-semibold text-foreground">No results found</h3>
  <p class="mt-2 max-w-sm text-sm text-muted-foreground">
    Try adjusting your search or filters to find what you're looking for.
  </p>
  <button
    class="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
  >
    Clear Filters
  </button>
</div>
```

---

## Animation Patterns

### CSS Transitions

```html
<!-- Hover scale -->
<div class="transition-transform duration-200 hover:scale-105">
  Scales up on hover
</div>

<!-- Color transition -->
<button
  class="bg-primary text-primary-foreground transition-colors duration-150 hover:bg-primary/90"
>
  Smooth color change
</button>

<!-- Multiple properties -->
<div
  class="transition-all duration-300 ease-out hover:translate-y-[-2px] hover:shadow-lg"
>
  Lifts and shadows on hover
</div>
```

### Keyframe Animations

```css
/* Define in @theme block */
@theme {
  --animate-slide-up: slide-up 0.3s ease-out;
  --animate-slide-down: slide-down 0.2s ease-out;
  --animate-fade-in: fade-in 0.3s ease-out;
  --animate-scale-in: scale-in 0.2s ease-out;
  --animate-spin-slow: spin 3s linear infinite;

  @keyframes slide-up {
    from {
      transform: translateY(8px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  @keyframes slide-down {
    from {
      transform: translateY(-8px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  @keyframes scale-in {
    from {
      transform: scale(0.95);
      opacity: 0;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }
}
```

```html
<!-- Usage -->
<div class="animate-fade-in">Fades in on mount</div>
<div class="animate-slide-up">Slides up on mount</div>
<div class="animate-spin-slow">Slow spinner</div>
```

### @starting-style Entry Animations

```css
/* CSS-native entry animations — no JS needed */
.dialog-panel {
  opacity: 1;
  transform: scale(1);
  transition:
    opacity 0.3s,
    transform 0.3s;

  @starting-style {
    opacity: 0;
    transform: scale(0.95);
  }
}
```

### Staggered Animations

```html
<!-- Stagger children with animation-delay -->
<div class="space-y-2">
  <div class="animate-slide-up [animation-delay:0ms]">Item 1</div>
  <div
    class="animate-slide-up [animation-delay:50ms] [animation-fill-mode:backwards]"
  >
    Item 2
  </div>
  <div
    class="animate-slide-up [animation-delay:100ms] [animation-fill-mode:backwards]"
  >
    Item 3
  </div>
  <div
    class="animate-slide-up [animation-delay:150ms] [animation-fill-mode:backwards]"
  >
    Item 4
  </div>
</div>
```

### Reduced Motion

```html
<!-- Respect user preferences -->
<div class="animate-fade-in motion-reduce:animate-none">
  Skips animation if user prefers reduced motion
</div>

<div
  class="transition-transform duration-300 hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none"
>
  No transform for reduced motion users
</div>
```

---

## Dark Mode

### Setup

Dark mode in Tailwind v4 uses class strategy by default — no configuration needed. Toggle the `dark` class on `<html>` or `<body>`.

```html
<html class="dark">
  <!-- All dark: prefixed utilities activate -->
</html>
```

### Dark Mode Tokens

Define light tokens in `@theme`, override in `.dark`:

```css
@import "tailwindcss";

@theme {
  --color-background: #ffffff;
  --color-foreground: #0a0a0a;
  --color-card: #ffffff;
  --color-card-foreground: #0a0a0a;
  --color-muted: #f5f5f5;
  --color-muted-foreground: #737373;
  --color-border: #e5e5e5;
}

.dark {
  --color-background: #0a0a0a;
  --color-foreground: #fafafa;
  --color-card: #0a0a0a;
  --color-card-foreground: #fafafa;
  --color-muted: #262626;
  --color-muted-foreground: #a3a3a3;
  --color-border: #262626;
}
```

With this approach, you use `bg-background`, `text-foreground`, `border-border` etc. — no `dark:` prefix needed for token-based colors.

### Explicit dark: Prefix

For cases where you need different styles beyond tokens:

```html
<div class="bg-white dark:bg-gray-900">
  <p class="text-gray-900 dark:text-gray-100">Explicit dark mode</p>
  <div class="shadow-md dark:shadow-gray-900/50">Shadow adapts</div>
</div>
```

### Theme Toggle (Vanilla JS)

```html
<script>
  // Check system preference + saved preference
  const theme =
    localStorage.getItem("theme") ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light");
  document.documentElement.classList.toggle("dark", theme === "dark");

  function toggleTheme() {
    const isDark = document.documentElement.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }
</script>

<button
  onclick="toggleTheme()"
  class="rounded-md p-2 hover:bg-accent"
  aria-label="Toggle theme"
>
  <!-- Sun icon (shown in dark mode) -->
  <svg
    class="hidden h-5 w-5 dark:block"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
  <!-- Moon icon (shown in light mode) -->
  <svg
    class="block h-5 w-5 dark:hidden"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
    />
  </svg>
</button>
```

---

## Accessibility Patterns

### Focus Management

```html
<!-- Visible focus ring on keyboard navigation -->
<button
  class="rounded-md bg-primary px-4 py-2 text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
>
  Keyboard-accessible button
</button>

<!-- Skip to content link -->
<a
  href="#main-content"
  class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
>
  Skip to main content
</a>

<!-- Focus trap indicator (for modals) -->
<div
  role="dialog"
  aria-modal="true"
  class="focus-within:ring-2 focus-within:ring-ring"
>
  Dialog content
</div>
```

### Screen Reader Utilities

```html
<!-- Visually hidden but accessible to screen readers -->
<span class="sr-only">Close dialog</span>

<!-- Icon button with accessible label -->
<button
  aria-label="Delete item"
  class="rounded-md p-2 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
>
  <svg
    class="h-4 w-4"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
</button>

<!-- Live region for dynamic content -->
<div aria-live="polite" aria-atomic="true" class="sr-only">
  3 new notifications
</div>
```

### Color Contrast

```html
<!-- Ensure sufficient contrast ratios -->
<!-- ✅ Good: text-foreground on bg-background -->
<p class="text-foreground">High contrast text</p>

<!-- ✅ Good: text-muted-foreground for secondary text -->
<p class="text-muted-foreground">Secondary text (4.5:1+ ratio)</p>

<!-- ❌ Avoid: low contrast combinations -->
<!-- <p class="text-gray-400 bg-gray-300">Hard to read</p> -->
```

### Semantic HTML + ARIA

```html
<!-- Navigation landmark -->
<nav aria-label="Main navigation">
  <ul role="list" class="flex gap-4">
    <li>
      <a href="#" aria-current="page" class="font-medium text-foreground"
        >Home</a
      >
    </li>
    <li>
      <a href="#" class="text-muted-foreground hover:text-foreground">About</a>
    </li>
  </ul>
</nav>

<!-- Form with proper labeling -->
<form aria-label="Contact form">
  <fieldset>
    <legend class="text-lg font-semibold text-foreground">
      Contact Information
    </legend>
    <div class="mt-4 space-y-4">
      <div>
        <label for="name" class="text-sm font-medium text-foreground"
          >Full Name</label
        >
        <input
          id="name"
          type="text"
          required
          aria-required="true"
          class="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>
    </div>
  </fieldset>
</form>

<!-- Status messages -->
<div
  role="status"
  class="rounded-md bg-green-500/10 p-4 text-sm text-green-600"
>
  Form submitted successfully.
</div>
<div
  role="alert"
  class="rounded-md bg-destructive/10 p-4 text-sm text-destructive"
>
  An error occurred. Please try again.
</div>
```

### Reduced Motion

```html
<!-- Always provide motion-safe alternatives -->
<div class="transition-all duration-300 motion-reduce:transition-none">
  Respects prefers-reduced-motion
</div>

<!-- Disable animations for reduced motion users -->
<div class="animate-bounce motion-reduce:animate-none">
  Bounces only if user allows motion
</div>
```

---

## Responsive Breakpoints Reference

### Viewport Breakpoints

| Prefix | Min-width | Typical device |
| ------ | --------- | -------------- |
| `sm:`  | 640px     | Large phones   |
| `md:`  | 768px     | Tablets        |
| `lg:`  | 1024px    | Laptops        |
| `xl:`  | 1280px    | Desktops       |
| `2xl:` | 1536px    | Large screens  |

### Container Query Breakpoints

| Prefix  | Min-width | Use case              |
| ------- | --------- | --------------------- |
| `@xs:`  | 20rem     | Tiny containers       |
| `@sm:`  | 24rem     | Small sidebars        |
| `@md:`  | 28rem     | Medium panels         |
| `@lg:`  | 32rem     | Large panels          |
| `@xl:`  | 36rem     | Wide containers       |
| `@2xl:` | 42rem     | Full-width sections   |
| `@3xl:` | 48rem     | Extra-wide containers |

### Mobile-First Pattern

```html
<!-- Always design mobile-first, then add breakpoints -->
<div
  class="
  grid grid-cols-1 gap-4 p-4
  sm:grid-cols-2 sm:gap-6
  lg:grid-cols-3 lg:p-6
  xl:grid-cols-4
"
>
  <div>Card</div>
</div>

<!-- Hide/show at breakpoints -->
<div class="block md:hidden">Mobile only</div>
<div class="hidden md:block">Desktop only</div>

<!-- Container-responsive alternative -->
<div class="@container">
  <div class="grid grid-cols-1 @sm:grid-cols-2 @lg:grid-cols-3 gap-4">
    <div>Card</div>
  </div>
</div>
```

---

## Best Practices

### Tailwind v4 Essentials

1. **Use `@import "tailwindcss"`** — replaces the old `@tailwind base/components/utilities` directives
2. **Use `@theme` directive for design tokens** — replaces `tailwind.config.js` theme configuration
3. **Content detection is automatic** — no manual `content` array needed in most projects
4. **Use `@tailwindcss/vite`** for Vite projects, `@tailwindcss/postcss` for PostCSS projects
5. **Use container queries (`@container`)** for component-level responsiveness instead of viewport breakpoints
6. **Use `oklch()` color format** for better perceptual uniformity and color manipulation
7. **Use `not-*` variant** for negation styling instead of complex selectors
8. **Run `npx @tailwindcss/upgrade`** to automate migration from v3

### Design Token Strategy

- Define all colors, radii, fonts, and animations in `@theme`
- Override tokens in `.dark` for dark mode — components use semantic names like `bg-background`
- Avoid hardcoded color values in markup — always reference tokens
- Use OKLCH for custom color scales; hex/rgb for simple overrides

### Performance

- Tailwind v4 Oxide engine handles performance — no purge configuration needed
- Prefer utility classes over `@apply` — utilities are tree-shaken automatically
- Use `@layer components` for reusable component classes
- Avoid dynamic class construction: `bg-${color}-500` won't be detected — use complete class names

### Component Architecture

- Use semantic color tokens: `bg-card`, `text-foreground`, `border-border`
- Compose with utility classes first, extract components only when patterns repeat 3+ times
- Use container queries for reusable components that live in different layout contexts
- Keep component markup readable — group related utilities on the same line

### Accessibility Checklist

- Always include `focus-visible:` styles on interactive elements
- Use `sr-only` for screen-reader-only content
- Add `aria-label` to icon-only buttons
- Use `role`, `aria-current`, `aria-expanded`, `aria-modal` where appropriate
- Respect `motion-reduce:` for users who prefer reduced motion
- Ensure color contrast meets WCAG AA (4.5:1 for text, 3:1 for large text)
- Use semantic HTML elements (`nav`, `main`, `header`, `footer`, `section`)
- Provide `alt` text for all images

### File Organization

```
globals.css              ← @import "tailwindcss" + @theme + .dark overrides
├── @theme { }           ← Design tokens (colors, radius, fonts, animations)
├── .dark { }            ← Dark mode token overrides
├── @source "..."        ← Explicit source paths (if needed)
├── @utility ...         ← Custom utilities
├── @variant ...         ← Custom variants
└── @layer components    ← Reusable component classes
```
