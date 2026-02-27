---
inclusion: fileMatch
fileMatchPattern: "**/*.{tsx,jsx,ts}"
---

# Next.js & React — Critical Rules Only

> Top 20 rules by impact. Full reference: #advanced-react-patterns (manual steering)

## 1. Eliminating Waterfalls (CRITICAL)

**Promise.all for independent operations:**

```typescript
// BAD: 3 sequential round trips
const user = await fetchUser();
const posts = await fetchPosts();
const config = await fetchConfig();

// GOOD: 1 parallel round trip
const [user, posts, config] = await Promise.all([
  fetchUser(),
  fetchPosts(),
  fetchConfig(),
]);
```

**Defer await until needed:**

```typescript
// BAD: blocks both branches
async function handle(userId: string, skip: boolean) {
  const data = await fetchData(userId);
  if (skip) return { skipped: true };
  return process(data);
}
// GOOD: only blocks when needed
async function handle(userId: string, skip: boolean) {
  if (skip) return { skipped: true };
  const data = await fetchData(userId);
  return process(data);
}
```

**Suspense boundaries for streaming:**

```tsx
<Suspense fallback={<Skeleton />}>
  <DataDisplay />
</Suspense>
```

## 2. Bundle Size (CRITICAL)

**Avoid barrel imports:**

```tsx
// BAD: loads entire library
import { Check, X } from "lucide-react";
// GOOD: tree-shakeable
import Check from "lucide-react/dist/esm/icons/check";
```

**Dynamic imports for heavy components:**

```tsx
const MonacoEditor = dynamic(() => import("./monaco-editor"), { ssr: false });
```

## 3. Server-Side (HIGH)

**Auth in Server Actions — they're public endpoints:**

```typescript
"use server";
export async function deleteUser(userId: string) {
  const session = await verifySession();
  if (!session) throw unauthorized();
  // ...
}
```

**Minimize RSC serialization — pass only needed fields:**

```tsx
// BAD
<Profile user={user} />
// GOOD
<Profile name={user.name} avatar={user.avatar} />
```

**Per-request dedup with React.cache():**

```typescript
import { cache } from "react";
export const getCurrentUser = cache(async () => {
  const session = await auth();
  return session?.user ?? null;
});
```

## 4. Re-render Prevention (MEDIUM)

**Derive state during render — don't store computed values:**

```tsx
// BAD
const [fullName, setFullName] = useState("");
useEffect(() => setFullName(first + " " + last), [first, last]);
// GOOD
const fullName = first + " " + last;
```

**Functional setState to avoid stale closures:**

```tsx
const addItem = useCallback((item: Item) => {
  setItems((curr) => [...curr, item]);
}, []);
```

**Lazy state initialization:**

```tsx
const [settings] = useState(() =>
  JSON.parse(localStorage.getItem("s") ?? "{}"),
);
```

**Narrow effect dependencies — use primitives:**

```tsx
// BAD: re-runs on any user change
useEffect(() => {
  log(user.id);
}, [user]);
// GOOD: re-runs only on id change
useEffect(() => {
  log(user.id);
}, [user.id]);
```

## 5. Performance Quick Checks

- `Set/Map` for O(1) lookups instead of `.find()` in loops
- `.toSorted()` instead of `.sort()` (immutable)
- `content-visibility: auto` for long lists
- `{ passive: true }` on touch/wheel listeners
- `startTransition()` for non-urgent state updates

## Anti-Patterns Checklist

- ❌ Sequential await for independent operations
- ❌ Barrel imports (lucide-react, @mui/material, lodash)
- ❌ Skip dynamic imports for heavy components
- ❌ .sort() mutating arrays in React state
- ❌ useEffect for derived state
- ❌ Missing auth in Server Actions
