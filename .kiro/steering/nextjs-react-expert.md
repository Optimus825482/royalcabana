---
inclusion: fileMatch
fileMatchPattern: "**/*.{tsx,jsx,ts}"
---

# Next.js & React Performance Expert

> From Vercel Engineering — 57 optimization rules prioritized by impact
> Philosophy: Eliminate waterfalls first, optimize bundles second, then micro-optimize.

## Content Map

| Section                      | Impact      | Rules | When to Apply                         |
| ---------------------------- | ----------- | ----- | ------------------------------------- |
| 1. Eliminating Waterfalls    | CRITICAL    | 5     | Slow page loads, sequential API calls |
| 2. Bundle Size Optimization  | CRITICAL    | 5     | Large bundle, slow TTI                |
| 3. Server-Side Performance   | HIGH        | 7     | Slow SSR, API route optimization      |
| 4. Client-Side Data Fetching | MEDIUM-HIGH | 4     | SWR patterns, deduplication           |
| 5. Re-render Optimization    | MEDIUM      | 12    | Excessive re-renders, memoization     |
| 6. Rendering Performance     | MEDIUM      | 9     | Virtualization, image optimization    |
| 7. JavaScript Performance    | LOW-MEDIUM  | 12    | Micro-optimizations, caching          |
| 8. Advanced Patterns         | VARIABLE    | 3     | useLatest, init-once                  |

## Quick Decision Tree

- Slow page loads → Section 1 + 2
- Large bundle (>200KB) → Section 2
- Slow SSR → Section 3
- Too many re-renders → Section 5
- Rendering issues → Section 6
- Client data fetching → Section 4

---

# 1. Eliminating Waterfalls (CRITICAL)

## Rule 1.1: Defer Await Until Needed

Move `await` into branches where actually used. Skip fetching on early-return paths.

```typescript
// BAD: blocks both branches
async function handleRequest(userId: string, skip: boolean) {
  const data = await fetchUserData(userId);
  if (skip) return { skipped: true };
  return processUserData(data);
}

// GOOD: only blocks when needed
async function handleRequest(userId: string, skip: boolean) {
  if (skip) return { skipped: true };
  const data = await fetchUserData(userId);
  return processUserData(data);
}
```

## Rule 1.2: Dependency-Based Parallelization

For partial dependencies, start independent ops immediately.

```typescript
// BAD: config waits for user unnecessarily
const [user, config] = await Promise.all([fetchUser(), fetchConfig()]);
const profile = await fetchProfile(user.id);

// GOOD: config and profile run in parallel
const userPromise = fetchUser();
const profilePromise = userPromise.then((user) => fetchProfile(user.id));
const [user, config, profile] = await Promise.all([
  userPromise,
  fetchConfig(),
  profilePromise,
]);
```

## Rule 1.3: Prevent Waterfall Chains in API Routes

Start independent operations immediately in API routes and Server Actions.

```typescript
// BAD
export async function GET(request: Request) {
  const session = await auth();
  const config = await fetchConfig();
  const data = await fetchData(session.user.id);
  return Response.json({ data, config });
}

// GOOD
export async function GET(request: Request) {
  const sessionPromise = auth();
  const configPromise = fetchConfig();
  const session = await sessionPromise;
  const [config, data] = await Promise.all([
    configPromise,
    fetchData(session.user.id),
  ]);
  return Response.json({ data, config });
}
```

## Rule 1.4: Promise.all() for Independent Operations

```typescript
// BAD: 3 round trips
const user = await fetchUser();
const posts = await fetchPosts();
const comments = await fetchComments();

// GOOD: 1 round trip
const [user, posts, comments] = await Promise.all([
  fetchUser(),
  fetchPosts(),
  fetchComments(),
]);
```

## Rule 1.5: Strategic Suspense Boundaries

Show wrapper UI faster while data loads.

```tsx
// GOOD: Sidebar/Header/Footer render immediately
function Page() {
  return (
    <div>
      <Sidebar />
      <Header />
      <Suspense fallback={<Skeleton />}>
        <DataDisplay />
      </Suspense>
      <Footer />
    </div>
  );
}
```

---

# 2. Bundle Size Optimization (CRITICAL)

## Rule 2.1: Avoid Barrel File Imports

Import directly from source files instead of barrel files (index.ts re-exports).

```tsx
// BAD: loads 1,583 modules
import { Check, X, Menu } from "lucide-react";

// GOOD: loads only 3 modules
import Check from "lucide-react/dist/esm/icons/check";
import X from "lucide-react/dist/esm/icons/x";
import Menu from "lucide-react/dist/esm/icons/menu";

// ALTERNATIVE: Next.js 13.5+ optimizePackageImports
// next.config.js
module.exports = {
  experimental: {
    optimizePackageImports: ["lucide-react", "@mui/material"],
  },
};
```

Commonly affected: `lucide-react`, `@mui/material`, `@radix-ui/react-*`, `lodash`, `date-fns`, `react-icons`.

## Rule 2.2: Conditional Module Loading

Load large data/modules only when a feature is activated.

```tsx
useEffect(() => {
  if (enabled && !frames && typeof window !== "undefined") {
    import("./animation-frames.js")
      .then((mod) => setFrames(mod.frames))
      .catch(() => setEnabled(false));
  }
}, [enabled, frames, setEnabled]);
```

## Rule 2.3: Defer Non-Critical Third-Party Libraries

Analytics, logging, error tracking — load after hydration.

```tsx
const Analytics = dynamic(
  () => import("@vercel/analytics/react").then((m) => m.Analytics),
  { ssr: false },
);
```

## Rule 2.4: Dynamic Imports for Heavy Components

```tsx
// BAD: Monaco bundles with main chunk (~300KB)
import { MonacoEditor } from "./monaco-editor";

// GOOD: Monaco loads on demand
const MonacoEditor = dynamic(
  () => import("./monaco-editor").then((m) => m.MonacoEditor),
  { ssr: false },
);
```

## Rule 2.5: Preload Based on User Intent

```tsx
function EditorButton({ onClick }: { onClick: () => void }) {
  const preload = () => {
    void import("./monaco-editor");
  };
  return (
    <button onMouseEnter={preload} onFocus={preload} onClick={onClick}>
      Open Editor
    </button>
  );
}
```

---

# 3. Server-Side Performance (HIGH)

## Rule 3.1: Authenticate Server Actions Like API Routes

Server Actions are public endpoints. Always verify auth INSIDE each action.

```typescript
"use server";
export async function deleteUser(userId: string) {
  const session = await verifySession();
  if (!session) throw unauthorized("Must be logged in");
  if (session.user.role !== "admin" && session.user.id !== userId) {
    throw unauthorized("Cannot delete other users");
  }
  await db.user.delete({ where: { id: userId } });
}
```

## Rule 3.2: Avoid Duplicate Serialization in RSC Props

Do transformations (.toSorted(), .filter(), .map()) in client, not server.

```tsx
// BAD: sends 6 strings (2 arrays × 3 items)
<ClientList usernames={usernames} usernamesOrdered={usernames.toSorted()} />

// GOOD: sends 3 strings, sort in client
<ClientList usernames={usernames} />
// Client: const sorted = useMemo(() => [...usernames].sort(), [usernames])
```

## Rule 3.3: Cross-Request LRU Caching

React.cache() only works within one request. Use LRU for cross-request caching.

```typescript
import { LRUCache } from "lru-cache";
const cache = new LRUCache<string, any>({ max: 1000, ttl: 5 * 60 * 1000 });

export async function getUser(id: string) {
  const cached = cache.get(id);
  if (cached) return cached;
  const user = await db.user.findUnique({ where: { id } });
  cache.set(id, user);
  return user;
}
```

## Rule 3.4: Minimize Serialization at RSC Boundaries

Only pass fields that the client actually uses.

```tsx
// BAD: serializes all 50 fields
<Profile user={user} />

// GOOD: serializes only 1 field
<Profile name={user.name} />
```

## Rule 3.5: Parallel Data Fetching with Component Composition

```tsx
// GOOD: both fetch simultaneously
async function Header() {
  const data = await fetchHeader();
  return <div>{data}</div>;
}
async function Sidebar() {
  const items = await fetchSidebarItems();
  return <nav>{items.map(renderItem)}</nav>;
}

export default function Page() {
  return (
    <div>
      <Header />
      <Sidebar />
    </div>
  );
}
```

## Rule 3.6: Per-Request Deduplication with React.cache()

```typescript
import { cache } from "react";
export const getCurrentUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return await db.user.findUnique({ where: { id: session.user.id } });
});
```

Avoid inline objects as arguments — use primitives for cache hits.

## Rule 3.7: Use after() for Non-Blocking Operations

```tsx
import { after } from "next/server";
export async function POST(request: Request) {
  await updateDatabase(request);
  after(async () => {
    const userAgent = (await headers()).get("user-agent") || "unknown";
    logUserAction({ userAgent });
  });
  return Response.json({ status: "success" });
}
```

---

# 4. Client-Side Data Fetching (MEDIUM-HIGH)

## Rule 4.1: Deduplicate Global Event Listeners

Use useSWRSubscription() to share global event listeners across component instances.

## Rule 4.2: Use Passive Event Listeners for Scrolling

Add `{ passive: true }` to touch and wheel event listeners.

```typescript
document.addEventListener("touchstart", handleTouch, { passive: true });
document.addEventListener("wheel", handleWheel, { passive: true });
```

## Rule 4.3: Use SWR for Automatic Deduplication

```tsx
// BAD: no deduplication
useEffect(() => {
  fetch("/api/users")
    .then((r) => r.json())
    .then(setUsers);
}, []);

// GOOD: multiple instances share one request
const { data: users } = useSWR("/api/users", fetcher);
```

## Rule 4.4: Version and Minimize localStorage Data

Add version prefix to keys, store only needed fields, always wrap in try-catch.

```typescript
const VERSION = "v2";
function saveConfig(config: { theme: string; language: string }) {
  try {
    localStorage.setItem(`userConfig:${VERSION}`, JSON.stringify(config));
  } catch {}
}
```

---

# 5. Re-render Optimization (MEDIUM)

## Rule 5.1: Calculate Derived State During Rendering

If a value can be computed from props/state, derive it during render — don't store in state.

```tsx
// BAD: redundant state + effect
const [fullName, setFullName] = useState("");
useEffect(() => {
  setFullName(firstName + " " + lastName);
}, [firstName, lastName]);

// GOOD: derive during render
const fullName = firstName + " " + lastName;
```

## Rule 5.2: Defer State Reads to Usage Point

Don't subscribe to searchParams if you only read inside callbacks.

```tsx
// GOOD: reads on demand, no subscription
const handleShare = () => {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  shareChat(chatId, { ref });
};
```

## Rule 5.3: Don't useMemo Simple Primitive Expressions

Calling useMemo + comparing deps may cost more than the expression itself.

```tsx
// BAD
const isLoading = useMemo(
  () => user.isLoading || notifications.isLoading,
  [user.isLoading, notifications.isLoading],
);

// GOOD
const isLoading = user.isLoading || notifications.isLoading;
```

## Rule 5.4: Extract Default Non-primitive Values from Memoized Components

```tsx
const NOOP = () => {};
const UserAvatar = memo(function UserAvatar({
  onClick = NOOP,
}: {
  onClick?: () => void;
}) {
  /* ... */
});
```

## Rule 5.5: Extract to Memoized Components

Extract expensive work into memoized components to enable early returns before computation.

## Rule 5.6: Narrow Effect Dependencies

Use primitive dependencies instead of objects.

```tsx
// BAD: re-runs on any user field change
useEffect(() => {
  console.log(user.id);
}, [user]);

// GOOD: re-runs only when id changes
useEffect(() => {
  console.log(user.id);
}, [user.id]);
```

## Rule 5.7: Put Interaction Logic in Event Handlers

Don't model user actions as state + effect. Run side effects directly in handlers.

## Rule 5.8: Subscribe to Derived State

Subscribe to derived boolean instead of continuous values.

```tsx
// BAD: re-renders on every pixel
const width = useWindowWidth();
const isMobile = width < 768;

// GOOD: re-renders only on boolean change
const isMobile = useMediaQuery("(max-width: 767px)");
```

## Rule 5.9: Use Functional setState Updates

Prevents stale closures, eliminates unnecessary dependencies.

```tsx
// GOOD: stable callback, no stale closures
const addItems = useCallback((newItems: Item[]) => {
  setItems((curr) => [...curr, ...newItems]);
}, []);
```

## Rule 5.10: Use Lazy State Initialization

Pass a function to useState for expensive initial values.

```tsx
// GOOD: runs only once
const [settings, setSettings] = useState(() => {
  const stored = localStorage.getItem("settings");
  return stored ? JSON.parse(stored) : {};
});
```

## Rule 5.11: Use Transitions for Non-Urgent Updates

Mark frequent, non-urgent state updates as transitions.

```tsx
import { startTransition } from "react";
const handler = () => {
  startTransition(() => setScrollY(window.scrollY));
};
```

## Rule 5.12: Use useRef for Transient Values

Store frequently changing values that don't need re-render in refs.

---

# 6. Rendering Performance (MEDIUM)

## Rule 6.1: Animate SVG Wrapper Instead of SVG Element

Wrap SVG in a div and animate the wrapper for hardware acceleration.

## Rule 6.2: CSS content-visibility for Long Lists

```css
.message-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 80px;
}
```

For 1000 items, browser skips layout/paint for ~990 off-screen items.

## Rule 6.3: Hoist Static JSX Elements

Extract static JSX outside components to avoid re-creation.

## Rule 6.4: Optimize SVG Precision

`npx svgo --precision=1 --multipass icon.svg`

## Rule 6.5: Prevent Hydration Mismatch Without Flickering

Use synchronous inline script to set DOM before React hydrates (theme, preferences).

## Rule 6.6: Suppress Expected Hydration Mismatches

Use `suppressHydrationWarning` for intentionally different server/client values (dates, random IDs).

## Rule 6.7: Use Activity Component for Show/Hide

```tsx
import { Activity } from "react";
<Activity mode={isOpen ? "visible" : "hidden"}>
  <ExpensiveMenu />
</Activity>;
```

## Rule 6.8: Use Explicit Conditional Rendering

Use ternary `? :` instead of `&&` when condition can be `0`, `NaN`, or falsy.

## Rule 6.9: Use useTransition Over Manual Loading States

Built-in isPending, automatic error resilience, interrupt handling.

---

# 7. JavaScript Performance (LOW-MEDIUM)

## Rule 7.1: Avoid Layout Thrashing

Batch all writes together, then read. Or use CSS classes.

## Rule 7.2: Build Index Maps for Repeated Lookups

```typescript
// BAD: O(n) per lookup
users.find((u) => u.id === order.userId);

// GOOD: O(1) per lookup
const userById = new Map(users.map((u) => [u.id, u]));
userById.get(order.userId);
```

## Rule 7.3: Cache Property Access in Loops

Cache deep property lookups and array.length in hot paths.

## Rule 7.4: Cache Repeated Function Calls

Use module-level Map for memoization (not hooks — works everywhere).

## Rule 7.5: Cache Storage API Calls

localStorage/sessionStorage/document.cookie are synchronous and expensive. Cache in memory.

## Rule 7.6: Combine Multiple Array Iterations

Multiple .filter() calls → single for loop.

## Rule 7.7: Early Length Check for Array Comparisons

Check lengths first before expensive sorting/comparison.

## Rule 7.8: Early Return from Functions

Return immediately when result is determined.

## Rule 7.9: Hoist RegExp Creation

Don't create RegExp inside render. Hoist to module scope or useMemo.

## Rule 7.10: Use Loop for Min/Max Instead of Sort

Finding min/max only requires O(n) single pass, not O(n log n) sort.

## Rule 7.11: Use Set/Map for O(1) Lookups

```typescript
const allowedIds = new Set(["a", "b", "c"]);
items.filter((item) => allowedIds.has(item.id));
```

## Rule 7.12: Use toSorted() Instead of sort()

.sort() mutates the array — use .toSorted() for immutability in React.

---

# 8. Advanced Patterns (VARIABLE)

## Rule 8.1: Initialize App Once, Not Per Mount

Use module-level guard for app-wide initialization.

```tsx
let didInit = false;
function Comp() {
  useEffect(() => {
    if (didInit) return;
    didInit = true;
    loadFromStorage();
    checkAuthToken();
  }, []);
}
```

## Rule 8.2: Store Event Handlers in Refs

Stable subscription without re-subscribing on callback changes.

```tsx
function useWindowEvent(event: string, handler: (e: Event) => void) {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);
  useEffect(() => {
    const listener = (e: Event) => handlerRef.current(e);
    window.addEventListener(event, listener);
    return () => window.removeEventListener(event, listener);
  }, [event]);
}
```

## Rule 8.3: useEffectEvent for Stable Callback Refs

Access latest values in callbacks without adding to dependency arrays.

```tsx
import { useEffectEvent } from "react";
const onSearchEvent = useEffectEvent(onSearch);
useEffect(() => {
  const timeout = setTimeout(() => onSearchEvent(query), 300);
  return () => clearTimeout(timeout);
}, [query]);
```

---

## Anti-Patterns Checklist

- ❌ Sequential await for independent operations
- ❌ Import entire libraries (barrel imports)
- ❌ Skip dynamic imports for heavy components
- ❌ Fetch in useEffect without deduplication
- ❌ Use client components when server components work
- ❌ .sort() mutating arrays in React state
- ❌ Interleave DOM reads/writes (layout thrashing)

## Performance Review Checklist

Critical:

- [ ] No sequential data fetching (waterfalls eliminated)
- [ ] Bundle size < 200KB for main bundle
- [ ] No barrel imports in app code
- [ ] Dynamic imports for large components
- [ ] Parallel data fetching where possible

High:

- [ ] Server components used where appropriate
- [ ] API routes optimized (no N+1 queries)
- [ ] Suspense boundaries for data fetching

Medium:

- [ ] Expensive computations memoized
- [ ] Lists virtualized (if > 100 items)
- [ ] Images optimized with next/image
- [ ] No unnecessary re-renders
