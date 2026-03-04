---
name: "typescript-pro"
displayName: "TypeScript Pro Patterns"
description: "Advanced TypeScript patterns for production applications. Generics, utility types, strict error handling, type guards, branded types, and module patterns."
keywords:
  ["typescript", "generics", "type-safety", "utility-types", "type-guard"]
author: "Erkan"
---

# TypeScript Pro Patterns

## Overview

Production-ready TypeScript patterns that work in any project — React, Node.js, Deno, Bun, vanilla. Covers advanced generics, utility types, strict error handling, type guards, branded types, discriminated unions, module organization, and modern TS 5.9/6/7 features. Updated March 2026.

## TypeScript Version Landscape (2025–2026)

### TypeScript 5.9 (August 2025)

- `import defer` syntax for lazy module loading — module body is not evaluated until first property access. Only works under `--module preserve` or `--module esnext`.
- Redesigned `tsc --init` — generates a minimal, prescriptive tsconfig instead of a wall of commented-out options.
- `--module node20` support — aligns with Node.js 20 ESM/CJS interop rules.
- Expandable hovers (preview) — hover tooltips can be expanded for complex types. Configurable max hover length via editor settings.
- Summary descriptions in DOM APIs — built-in DOM type definitions now include short summary descriptions for better IntelliSense.

### TypeScript 6.0 Beta (February 2026 — Last JavaScript-Based Release)

This is the bridge release preparing for TypeScript 7. New defaults make strict configs built-in:

- `strict: true` is now DEFAULT — no need to set explicitly in new projects.
- `module` defaults to `esnext` (ESM-first world).
- `target` defaults to `es2025`.
- `types` defaults to empty array `[]` — no auto-including `@types/*` packages. Results in 20–50% faster builds.
- `baseUrl` no longer required for `paths` to work.
- Less context-sensitivity on `this`-less functions — fewer false positives in strict mode.
- ES2025 API support: `Temporal` types, `RegExp` enhancements, `Map` upsert helpers.
- Many deprecations: `es5` target removed, `classic` module resolution removed, legacy options cleaned up.

### TypeScript 7.0 (Coming 2026 — "Project Corsa")

Complete rewrite of the TypeScript compiler in Go (native code):

- 10x faster compilation and dramatically lower memory usage.
- Shared-memory parallelism — leverages multi-core CPUs for type-checking.
- `tsgo` command works alongside `tsc` — drop-in replacement for builds.
- Native preview VS Code extension already available: `@typescript/native-preview`.
- Editor features working: completions, auto-imports, go-to-definition, find-all-references, rename.
- Type-checking nearly complete: 20,000 test cases with ~6,000 passing and growing rapidly.
- Same TypeScript language — no syntax changes, just a faster compiler backend.

## Strict Configuration

```jsonc
// tsconfig.json — recommended for all projects (March 2026)
// TS 6+ defaults marked. Still set explicitly for TS 5.x compatibility.
{
  "compilerOptions": {
    "strict": true, // DEFAULT in TS 6+
    "noUncheckedIndexedAccess": true, // Catch undefined array/object access
    "noImplicitReturns": true, // Every code path must return
    "noFallthroughCasesInSwitch": true, // Prevent switch fallthrough bugs
    "exactOptionalPropertyTypes": true, // Distinguish undefined from missing
    "forceConsistentCasingInFileNames": true, // Cross-platform safety
    "isolatedModules": true, // Required for most bundlers
    "skipLibCheck": true, // Faster builds, skip .d.ts checking
    "module": "nodenext", // Node.js projects — use "esnext" for bundled
    "target": "es2025", // DEFAULT in TS 6+
    "moduleDetection": "force", // Treat all files as modules
    "types": [], // DEFAULT in TS 6+: explicit types only
  },
}
```

For bundled projects (Vite, Next.js, esbuild), use `"module": "esnext"` and `"moduleResolution": "bundler"` instead of `"nodenext"`.

## `import defer` — Lazy Module Loading (TS 5.9+)

Defers evaluation of a module until its first property access. The module specifier is resolved and fetched eagerly, but the module body does not execute until you actually use it. Requires `--module preserve` or `--module esnext`.

```typescript
// Heavy library is NOT evaluated at import time
import * as heavyLib from "./heavy-lib";

// ... other startup code runs first ...

// Module body executes HERE on first property access
const result = heavyLib.doSomething();

// Practical: defer analytics in a web app
import * as analytics from "./analytics";

function onUserAction(action: string) {
  // Analytics module loads only when user actually does something
  analytics.track(action);
}

// Practical: defer heavy computation modules
import * as imageProcessor from "./image-processor";

async function handleUpload(file: File) {
  // Image processing code loads only when needed
  const processed = await imageProcessor.resize(file, { width: 800 });
  return processed;
}
```

## `satisfies` Operator with `as const`

Validates a value matches a type without widening — preserves the narrower inferred type. Combining with `as const` gives you both validation and literal types.

```typescript
// Type is preserved as { width: number; color: string }
// NOT widened to Record<string, string | number>
const config = {
  width: 100,
  color: "red",
} satisfies Record<string, string | number>;

config.width; // number — not string | number
config.color; // string — not string | number

// satisfies + as const = validated literal types
const endpoints = {
  users: "/api/users",
  orders: "/api/orders",
  products: "/api/products",
} as const satisfies Record<string, `/${string}`>;

endpoints.users; // "/api/users" — literal, not string
// endpoints.bad  // ❌ Type error — not in the object

// Practical: route config with autocomplete + type safety
type RouteConfig = Record<string, { path: string; auth: boolean }>;

const routes = {
  home: { path: "/", auth: false },
  dashboard: { path: "/dashboard", auth: true },
  settings: { path: "/settings", auth: true },
} satisfies RouteConfig;

routes.home.path; // string — and routes.home is autocompleted

// Practical: theme config validated against a contract
type ThemeContract = {
  colors: Record<string, string>;
  spacing: Record<string, number>;
};

const theme = {
  colors: { primary: "#3b82f6", danger: "#ef4444", success: "#22c55e" },
  spacing: { sm: 4, md: 8, lg: 16, xl: 32 },
} as const satisfies ThemeContract;

theme.colors.primary; // "#3b82f6" — literal type preserved
theme.spacing.lg; // 16 — literal type preserved
```

## Explicit Resource Management (`using`)

Automatic cleanup when scope exits — like Python's `with` or C#'s `using`. TC39 Stage 3, supported in TS 5.2+. Requires `lib: ["esnext.disposable"]`.

```typescript
// Sync disposal
function openFile(path: string): Disposable {
  const handle = fs.openSync(path, "r");
  return {
    read: () => fs.readFileSync(handle, "utf-8"),
    [Symbol.dispose]() {
      fs.closeSync(handle);
    },
  };
}

function readFile(path: string) {
  using file = openFile(path); // auto-disposed when scope exits
  return file.read();
}
// file[Symbol.dispose]() called here — always closed

// Async disposal — database connections, streams, network
async function getDBConnection(): Promise<
  AsyncDisposable & {
    query: (sql: string) => Promise<any>;
  }
> {
  const conn = await pool.connect();
  return {
    query: (sql: string) => conn.query(sql),
    async [Symbol.asyncDispose]() {
      await conn.release();
    },
  };
}

async function fetchData() {
  await using connection = await getDBConnection();
  return connection.query("SELECT * FROM users");
}
// connection[Symbol.asyncDispose]() called here — always released

// DisposableStack for managing multiple resources
function processFiles(inputPath: string, outputPath: string) {
  using stack = new DisposableStack();
  const input = stack.use(openFile(inputPath));
  const output = stack.use(openFile(outputPath));
  // both disposed in reverse order when block exits
}

// Practical: lock management
function createLock(key: string): Disposable {
  acquireLock(key);
  return {
    [Symbol.dispose]() {
      releaseLock(key);
    },
  };
}

function criticalSection() {
  using lock = createLock("my-resource");
  // do work... lock is always released, even on throw
}
```

## `NoInfer<T>` Utility Type (TS 5.4+)

Prevents TypeScript from inferring a type parameter from a specific position. Forces the caller to be explicit or lets inference come from other arguments only.

```typescript
// Without NoInfer — TS infers S from both states AND initial
function createFSM<S extends string>(config: { initial: S; states: S[] }) {
  /* ... */
}

createFSM({ initial: "unknown", states: ["idle", "loading"] });
// TS infers S = "unknown" | "idle" | "loading" — oops, "unknown" leaked in

// With NoInfer — initial must be one of the inferred states
function createFSM<S extends string>(config: {
  initial: NoInfer<S>;
  states: S[];
}) {
  /* ... */
}

createFSM({ initial: "idle", states: ["idle", "loading"] }); // ✅ OK
// createFSM({ initial: "unknown", states: ["idle", "loading"] }); // ❌ Error

// Practical: default value must match inferred type
function createStore<T>(options: { values: T[]; defaultValue: NoInfer<T> }) {
  /* ... */
}

createStore({ values: [1, 2, 3], defaultValue: 0 }); // ✅ OK
// createStore({ values: [1, 2, 3], defaultValue: "nope" }); // ❌ Error

// Practical: event handler where event type comes from the map
function on<E extends string>(
  event: E,
  handler: (data: NoInfer<EventMap[E]>) => void,
) {
  /* ... */
}
```

## `const` Type Parameters

Force literal type inference on generic parameters — no more widening to `string[]`.

```typescript
function createConfig<const T extends readonly string[]>(items: T): T {
  return items;
}

const result = createConfig(["a", "b", "c"]);
// Type: readonly ["a", "b", "c"] — not string[]

// Practical: type-safe event emitter
function defineEvents<const T extends Record<string, unknown[]>>(events: T) {
  return events;
}

const events = defineEvents({
  click: [{ x: 0, y: 0 }],
  submit: [{ formId: "login" }],
});
// Type preserves exact shape, not Record<string, unknown[]>

// Practical: builder pattern with literal tracking
function createRoute<const T extends string>(path: T) {
  return { path } as const;
}

const route = createRoute("/api/users");
// route.path is "/api/users" — not string
```

## Temporal API Types (ES2025)

Modern date/time handling — replaces `Date`. Requires `target: "es2025"` or `lib: ["es2025"]`. Fully typed in TS 6.0+.

```typescript
// Current date/time
const now = Temporal.Now.plainDateTimeISO();
const today = Temporal.Now.plainDateISO();

// Create specific dates
const meeting = Temporal.PlainDateTime.from("2026-03-15T14:30");
const birthday = Temporal.PlainDate.from({ year: 1990, month: 6, day: 15 });

// Durations and arithmetic
const duration = Temporal.Duration.from({ hours: 1, minutes: 30 });
const endTime = meeting.add(duration);

// Time zone aware
const zonedNow = Temporal.Now.zonedDateTimeISO("Europe/Istanbul");
const utcNow = Temporal.Now.zonedDateTimeISO("UTC");

// Comparison
const isAfter = Temporal.PlainDate.compare(today, birthday) > 0; // true

// Practical: booking system
function isSlotAvailable(
  slotStart: Temporal.PlainDateTime,
  slotEnd: Temporal.PlainDateTime,
  requestedStart: Temporal.PlainDateTime,
  requestedEnd: Temporal.PlainDateTime,
): boolean {
  return (
    Temporal.PlainDateTime.compare(requestedEnd, slotStart) <= 0 ||
    Temporal.PlainDateTime.compare(requestedStart, slotEnd) >= 0
  );
}
```

## Utility Types Cheatsheet

```typescript
// Built-in utilities you should use daily
type UserUpdate = Partial<User>; // All fields optional
type UserRequired = Required<User>; // All fields required
type UserReadonly = Readonly<User>; // All fields readonly
type UserName = Pick<User, "name" | "email">; // Only specific fields
type UserNoPassword = Omit<User, "password">; // Exclude fields
type UserRecord = Record<string, User>; // Key-value map
type NonNullUser = NonNullable<User | null>; // Remove null/undefined
type UserReturn = ReturnType<typeof getUser>; // Function return type
type UserParams = Parameters<typeof createUser>; // Function params tuple
type UserAwaited = Awaited<Promise<User>>; // Unwrap Promise
type SafeInitial = NoInfer<State>; // Block inference from position

// Less common but powerful
type UserConstructor = ConstructorParameters<typeof UserClass>; // Constructor params
type UserInstance = InstanceType<typeof UserClass>; // Instance type
type UserThis = ThisParameterType<typeof method>; // Extract this type
type UserOmitThis = OmitThisParameter<typeof method>; // Remove this param
```

## Generic Patterns

### Constrained Generics

```typescript
// Constrain what T can be
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// Generic with default
function createList<T = string>(items: T[]): T[] {
  return [...items];
}

// Multiple constraints
function merge<T extends object, U extends object>(a: T, b: U): T & U {
  return { ...a, ...b };
}
```

### Generic API Response

```typescript
// Reusable across any project
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; code?: number };

// Type-safe fetch wrapper
async function apiFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) {
      return { success: false, error: res.statusText, code: res.status };
    }
    const data: T = await res.json();
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

// Usage — fully typed
const result = await apiFetch<User[]>("/api/users");
if (result.success) {
  result.data; // User[] — narrowed
} else {
  result.error; // string — narrowed
}
```

### Generic Repository Pattern

```typescript
interface Repository<T, CreateInput, UpdateInput> {
  findAll(params?: { page?: number; limit?: number }): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(data: CreateInput): Promise<T>;
  update(id: string, data: UpdateInput): Promise<T>;
  delete(id: string): Promise<void>;
}
```

## Discriminated Unions

```typescript
// The most powerful pattern for state management
type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string };

function renderState<T>(state: AsyncState<T>) {
  switch (state.status) {
    case "idle":
      return "Ready";
    case "loading":
      return "Loading...";
    case "success":
      return state.data; // T — narrowed
    case "error":
      return state.error; // string — narrowed
  }
}

// Event system
type AppEvent =
  | { type: "USER_LOGIN"; payload: { userId: string } }
  | { type: "USER_LOGOUT" }
  | { type: "ITEM_ADDED"; payload: { itemId: string; quantity: number } }
  | { type: "ERROR"; payload: { message: string; code: number } };

function handleEvent(event: AppEvent) {
  switch (event.type) {
    case "USER_LOGIN":
      console.log(event.payload.userId); // narrowed
      break;
    case "ITEM_ADDED":
      console.log(event.payload.quantity); // narrowed
      break;
  }
}

// Exhaustive check helper
function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`);
}
```

## Type Guards

```typescript
// Custom type guard
function isString(value: unknown): value is string {
  return typeof value === "string";
}

// Object type guard
interface ApiError {
  message: string;
  code: number;
}

function isApiError(value: unknown): value is ApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    "code" in value
  );
}

// Assertion function — throws if not valid
function assertDefined<T>(
  value: T | null | undefined,
  name: string,
): asserts value is T {
  if (value == null) {
    throw new Error(`Expected ${name} to be defined`);
  }
}

// Usage
const user = getUser(id);
assertDefined(user, "user"); // throws if null
user.name; // User — narrowed, no null check needed

// Array filter with type guard
const items: (string | null)[] = ["a", null, "b", null, "c"];
const strings = items.filter((x): x is string => x !== null);
// strings: string[] — not (string | null)[]
```

## Branded Types

```typescript
// Prevent mixing up primitive types
type UserId = string & { readonly __brand: "UserId" };
type OrderId = string & { readonly __brand: "OrderId" };
type Email = string & { readonly __brand: "Email" };

function createUserId(id: string): UserId {
  return id as UserId;
}

function createOrderId(id: string): OrderId {
  return id as OrderId;
}

function createEmail(value: string): Email {
  if (!value.includes("@")) throw new Error("Invalid email");
  return value as Email;
}

function getUser(id: UserId) {
  /* ... */
}
function getOrder(id: OrderId) {
  /* ... */
}

const userId = createUserId("usr_123");
const orderId = createOrderId("ord_456");

getUser(userId); // ✅ OK
// getUser(orderId); // ❌ Type error — can't mix

// Branded numeric types
type Cents = number & { readonly __brand: "Cents" };
type Dollars = number & { readonly __brand: "Dollars" };

function centsToDollars(cents: Cents): Dollars {
  return (cents / 100) as Dollars;
}
```

## Error Handling with Result Type

```typescript
// Never throw — return errors as values
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

function err<E>(error: E): Result<never, E> {
  return { ok: false, error };
}

// Usage
async function parseConfig(path: string): Promise<Result<Config, string>> {
  try {
    const raw = await readFile(path, "utf-8");
    const config = JSON.parse(raw);
    return ok(config);
  } catch {
    return err(`Failed to parse config at ${path}`);
  }
}

const result = await parseConfig("./config.json");
if (result.ok) {
  result.value; // Config
} else {
  result.error; // string
}

// Chain results
function map<T, U, E>(result: Result<T, E>, fn: (v: T) => U): Result<U, E> {
  return result.ok ? ok(fn(result.value)) : result;
}

function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (v: T) => Result<U, E>,
): Result<U, E> {
  return result.ok ? fn(result.value) : result;
}
```

## Mapped & Conditional Types

```typescript
// Make all properties optional and nullable recursively
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Make all properties readonly recursively
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// Extract only string-valued keys
type StringKeys<T> = {
  [K in keyof T]: T[K] extends string ? K : never;
}[keyof T];

// Conditional type
type IsArray<T> = T extends any[] ? true : false;

// Template literal types
type EventName = `on${Capitalize<string>}`;
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type ApiRoute = `/${string}`;
type Endpoint = `${HttpMethod} ${ApiRoute}`;

// Practical: auto-generate getter names
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

interface User {
  name: string;
  age: number;
}
type UserGetters = Getters<User>;
// { getName: () => string; getAge: () => number }
```

## Zod Integration Pattern

```typescript
import { z } from "zod";

// Define schema once, derive type
const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
  role: z.enum(["admin", "user", "guest"]),
});

// Type derived from schema — single source of truth
type User = z.infer<typeof userSchema>;

// Validation helper returning Result type
function validate<T>(schema: z.ZodSchema<T>, data: unknown): Result<T, string> {
  const parsed = schema.safeParse(data);
  if (parsed.success) return ok(parsed.data);
  return err(parsed.error.errors.map((e) => e.message).join(", "));
}

// Practical: API route validation
const createUserInput = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(["admin", "user", "guest"]).default("user"),
});

type CreateUserInput = z.infer<typeof createUserInput>;

// Partial schema for updates
const updateUserInput = createUserInput.partial();
type UpdateUserInput = z.infer<typeof updateUserInput>;
```

## Module Organization

```typescript
// Barrel exports — index.ts
export { UserService } from "./user.service";
export type { User, CreateUserInput } from "./user.types";

// Namespace pattern for related utilities
export const DateUtils = {
  format: (date: Date) => date.toISOString(),
  parse: (str: string) => new Date(str),
  isValid: (date: Date) => !isNaN(date.getTime()),
} as const;

// Const assertion for literal types
const ROLES = ["admin", "user", "guest"] as const;
type Role = (typeof ROLES)[number]; // "admin" | "user" | "guest"

const STATUS_MAP = {
  active: "Aktif",
  inactive: "Pasif",
  pending: "Beklemede",
} as const;
type Status = keyof typeof STATUS_MAP; // "active" | "inactive" | "pending"

// Type-safe environment variables
const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  NODE_ENV: z.enum(["development", "production", "test"]),
  PORT: z.coerce.number().default(3000),
});

export const env = envSchema.parse(process.env);
```

## Best Practices

- Always use `strict: true` — default in TS 6+, still set it explicitly for TS 5.x compatibility.
- Set `types: []` in tsconfig — explicit type inclusion avoids loading unnecessary `@types` packages. Default in TS 6+, 20–50% faster builds.
- Use `satisfies` operator to validate values without widening types — combine with `as const` for validated literals.
- Use `using` / `await using` for automatic resource cleanup — connections, files, locks (TC39 Explicit Resource Management).
- Use `NoInfer<T>` to prevent unwanted type inference from specific positions.
- Use `import defer` for lazy loading heavy modules — defers evaluation until first property access (TS 5.9+).
- Use `verbatimModuleSyntax: true` — enforces `import type` for type-only imports.
- Use `moduleResolution: "bundler"` for bundled projects, `"nodenext"` for Node.js.
- Prefer `unknown` over `any` — force type narrowing at usage site.
- Use discriminated unions for state, events, and polymorphism — always add exhaustive checks.
- Use `as const` for literal type inference, `const` type parameters for generic literal preservation.
- Derive types from schemas (Zod) — single source of truth, no type/schema drift.
- Use Result type instead of throwing errors — makes error handling explicit and composable.
- Use branded types to prevent ID/value mixing — `UserId` vs `OrderId` vs `Email`.
- Prefer `interface` for objects, `type` for unions/intersections/mapped types.
- Never use `!` (non-null assertion) — use type guards or assertion functions instead.
- Prepare for TypeScript 7 — install `@typescript/native-preview` VS Code extension to test the Go-based compiler now.
- TypeScript 6 makes `strict: true` default — align your existing configs now to avoid surprises.
- Use `Temporal` API instead of `Date` for new code — proper timezone handling, immutable, arithmetic built-in.
