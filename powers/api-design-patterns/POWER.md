---
name: "api-design-patterns"
displayName: "API Design Patterns"
description: "Framework-agnostic REST and GraphQL API design patterns. Response formats, error handling, pagination, versioning, authentication, rate limiting, and documentation."
keywords:
  [
    "api-design",
    "rest-api",
    "error-handling",
    "pagination",
    "api-versioning",
    "rate-limiting",
  ]
author: "Erkan"
---

# API Design Patterns

## Overview

Universal API design patterns that work with any backend framework — Express, Fastify, Next.js, Django, FastAPI, Go, Rust. Covers REST conventions, response formats, error handling (RFC 9457), ETags for optimistic concurrency, pagination, filtering, versioning, authentication patterns, rate limiting, streaming APIs, AI-friendly patterns, OpenAPI 3.1 documentation, and idempotency. Updated for 2026 trends including structured errors, ETag-based concurrency control, AI/LLM-friendly API design, and API-first development with OpenAPI 3.1.

## Protocol Selection Guide

```
REST:
  ✅ CRUD operations, public APIs, browser clients
  ✅ Caching with HTTP semantics (ETags, conditional requests)
  ❌ Real-time, complex queries

GraphQL:
  ✅ Complex data requirements, mobile apps
  ✅ Client-driven queries, type safety
  ❌ Simple CRUD, caching complexity

gRPC:
  ✅ Service-to-service, high performance
  ✅ Streaming, strong typing with Protobuf
  ❌ Browser clients (needs proxy), debugging

SSE (Server-Sent Events):
  ✅ Server-to-client streaming, AI/LLM responses
  ✅ Simple, HTTP-based, auto-reconnect
  ❌ Bidirectional communication

WebSocket:
  ✅ Bidirectional real-time (chat, gaming)
  ✅ Low latency, persistent connection
  ❌ Scaling complexity, no HTTP caching
```

### When to Use Which

```
Need CRUD + caching?                → REST
Need flexible client queries?       → GraphQL
Need service-to-service speed?      → gRPC
Need server push / AI streaming?    → SSE
Need two-way real-time?             → WebSocket
Need all of the above?              → Combine (REST + SSE is common)
```

## Response Format

### Standard Response Envelope

```typescript
// ALWAYS use this format — consistent across all endpoints
// This is the project convention for internal APIs
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;        // Machine-readable: "VALIDATION_ERROR", "NOT_FOUND"
    details?: unknown;   // Optional: field errors, stack trace (dev only)
  };
  meta?: {
    pagination?: Pagination;
    requestId?: string;
    timestamp?: string;
    etag?: string;       // ETag for concurrency control
    usage?: TokenUsage;  // AI/LLM endpoints
  };
}

// Success
{
  "success": true,
  "data": { "id": "usr_123", "name": "Erkan" }
}

// Error
{
  "success": false,
  "error": {
    "message": "Email already exists",
    "code": "DUPLICATE_ENTRY",
    "details": { "field": "email" }
  }
}

// List with pagination
{
  "success": true,
  "data": [{ "id": "usr_123" }, { "id": "usr_456" }],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 156,
      "pageCount": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### RFC 9457 — Problem Details for HTTP APIs (Public APIs)

RFC 9457 (formerly RFC 7807) is the IETF standard for structured error responses. Use this format for public-facing APIs, third-party integrations, and any API where interoperability matters. The `{ success, data, error }` envelope remains the project convention for internal APIs — both formats are valid, choose based on audience.

```typescript
// RFC 9457 Problem Details format
interface ProblemDetails {
  type: string;              // URI reference identifying the problem type
  title: string;             // Short human-readable summary
  status: number;            // HTTP status code
  detail?: string;           // Human-readable explanation specific to this occurrence
  instance?: string;         // URI reference identifying the specific occurrence
  [key: string]: unknown;    // Extension members (e.g., "errors", "traceId")
}

// Example: Validation error in RFC 9457 format
{
  "type": "https://api.example.com/errors/validation",
  "title": "Validation Error",
  "status": 422,
  "detail": "Email field is required and must be valid",
  "instance": "/api/users/123",
  "errors": [
    { "field": "email", "message": "Invalid email format" },
    { "field": "age", "message": "Must be a positive number" }
  ]
}

// Example: Not Found
{
  "type": "https://api.example.com/errors/not-found",
  "title": "Resource Not Found",
  "status": 404,
  "detail": "User with ID 'usr_999' does not exist",
  "instance": "/api/users/usr_999"
}

// Example: Rate Limited
{
  "type": "https://api.example.com/errors/rate-limited",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "Rate limit exceeded. Try again in 60 seconds.",
  "instance": "/api/users",
  "retryAfter": 60
}

// RFC 9457 error factory
function createProblemDetails(
  type: string,
  title: string,
  status: number,
  detail?: string,
  extensions?: Record<string, unknown>
): ProblemDetails {
  return {
    type,
    title,
    status,
    ...(detail && { detail }),
    ...(extensions && extensions),
  };
}

// Response helper — sets correct Content-Type
function problemResponse(problem: ProblemDetails): Response {
  return new Response(JSON.stringify(problem), {
    status: problem.status,
    headers: {
      "Content-Type": "application/problem+json",
    },
  });
}
```

### When to Use Which Error Format

```
Internal APIs (same team, same project):
  → Use { success, data, error } envelope — simpler, consistent with project convention

Public APIs (third-party consumers):
  → Use RFC 9457 Problem Details — interoperable, standard, tooling support

Hybrid approach:
  → Use envelope internally, RFC 9457 for public endpoints
  → Or wrap RFC 9457 inside the envelope: { success: false, error: ProblemDetails }
```

## HTTP Status Codes

```
// Success
200 OK              — GET, PATCH successful
201 Created         — POST successful (return created resource)
204 No Content      — DELETE successful (no body)

// Redirection
304 Not Modified    — ETag matched, client cache is valid

// Client Errors
400 Bad Request     — Malformed request, invalid JSON
401 Unauthorized    — Missing or invalid auth token
403 Forbidden       — Valid auth but insufficient permissions
404 Not Found       — Resource doesn't exist
409 Conflict        — Duplicate entry, state conflict
412 Precondition Failed — ETag mismatch (optimistic concurrency)
422 Unprocessable   — Validation errors (prefer over 400 for validation)
428 Precondition Required — If-Match header required but missing
429 Too Many Reqs   — Rate limit exceeded

// Server Errors
500 Internal Error  — Unexpected server error (log it, don't expose details)
503 Service Unavail — Maintenance or overload
```

### Status Code Decision Tree

```
Is the request malformed?           → 400
Is auth missing/invalid?            → 401
Is auth valid but no permission?    → 403
Does the resource exist?            → 404
Is there a validation error?        → 422
Is there a conflict (duplicate)?    → 409
ETag mismatch on update?            → 412
ETag required but missing?          → 428
Rate limited?                       → 429
Everything else server-side?        → 500
```

## Error Handling

### Error Response Pattern

```typescript
// Error codes — machine-readable, consistent
const ERROR_CODES = {
  VALIDATION_ERROR: 422,
  NOT_FOUND: 404,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  DUPLICATE_ENTRY: 409,
  PRECONDITION_FAILED: 412,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
} as const;

// Error factory (internal envelope format)
function createError(code: keyof typeof ERROR_CODES, message: string, details?: unknown) {
  return {
    success: false,
    error: { message, code, details },
  };
}

// Validation error with field details
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": [
      { "field": "email", "message": "Invalid email format" },
      { "field": "age", "message": "Must be a positive number" }
    ]
  }
}
```

### Error Handling Middleware Pattern

```typescript
// Centralized error handler — framework agnostic concept
function handleError(err: unknown): ApiResponse | ProblemDetails {
  // Known application errors
  if (err instanceof AppError) {
    return {
      success: false,
      error: {
        message: err.message,
        code: err.code,
        details: err.details,
      },
    };
  }

  // Validation errors (Zod, Joi, etc.)
  if (err instanceof ValidationError) {
    return {
      success: false,
      error: {
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details: err.errors,
      },
    };
  }

  // Concurrency conflict
  if (err instanceof ConcurrencyError) {
    return {
      success: false,
      error: {
        message: "Resource was modified by another request",
        code: "PRECONDITION_FAILED",
        details: { currentEtag: err.currentEtag },
      },
    };
  }

  // Unknown errors — log but don't expose
  console.error("Unhandled error:", err);
  return {
    success: false,
    error: {
      message: "Internal server error",
      code: "INTERNAL_ERROR",
    },
  };
}
```

## ETag / Optimistic Concurrency Control

92% of production APIs now use ETags for optimistic concurrency. ETags prevent lost updates when multiple clients modify the same resource simultaneously — no database-level locking required.

### How ETags Work

```
1. Client GETs a resource → server returns ETag header
2. Client PATCHes with If-Match: "<etag>" header
3. Server compares ETag:
   - Match → apply update, return new ETag
   - Mismatch → 412 Precondition Failed (resource changed since read)
4. Client can also use If-None-Match for conditional GETs (304 Not Modified)
```

### ETag Generation

```typescript
// Option 1: Hash-based ETag (stateless, works with any DB)
import { createHash } from "crypto";

function generateETag(data: unknown): string {
  const hash = createHash("md5").update(JSON.stringify(data)).digest("hex");
  return `"${hash}"`;
}

// Option 2: Version-based ETag (simpler, requires version column)
// Add a `version` integer column to your DB table, increment on every update
function versionETag(version: number): string {
  return `"v${version}"`;
}

// Option 3: Timestamp-based ETag
function timestampETag(updatedAt: Date): string {
  return `"${updatedAt.getTime()}"`;
}
```

### GET with ETag Response

```typescript
// GET /api/users/123
async function handleGet(req: Request, id: string) {
  const user = await db.findById(id);
  if (!user) return errorResponse("Not found", 404);

  const etag = generateETag(user);

  // Conditional GET — return 304 if client cache is fresh
  const ifNoneMatch = req.headers.get("if-none-match");
  if (ifNoneMatch === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }

  return new Response(JSON.stringify({ success: true, data: user }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      ETag: etag,
      "Cache-Control": "private, no-cache", // Must revalidate
    },
  });
}
```

### Update with If-Match (Optimistic Lock)

```typescript
// PATCH /api/users/123
// Headers: If-Match: "abc123"
// Body: { "name": "Updated Name" }
async function handleUpdate(req: Request, id: string) {
  const ifMatch = req.headers.get("if-match");

  // Optionally require If-Match for all updates
  if (!ifMatch) {
    return errorResponse("If-Match header is required for updates", 428);
  }

  const current = await db.findById(id);
  if (!current) return errorResponse("Not found", 404);

  const currentEtag = generateETag(current);

  // ETag mismatch → resource was modified by someone else
  if (ifMatch !== currentEtag) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message: "Resource was modified since your last read",
          code: "PRECONDITION_FAILED",
          details: {
            hint: "Re-fetch the resource and retry your update",
            currentEtag,
          },
        },
      }),
      {
        status: 412,
        headers: { "Content-Type": "application/json", ETag: currentEtag },
      },
    );
  }

  // ETag matches → safe to update
  const body = await req.json();
  const updated = await db.update(id, body);
  const newEtag = generateETag(updated);

  return new Response(JSON.stringify({ success: true, data: updated }), {
    status: 200,
    headers: { "Content-Type": "application/json", ETag: newEtag },
  });
}
```

### ETag Best Practices

- Use strong ETags (quoted strings) for exact match: `"abc123"`
- Use weak ETags for semantic equivalence: `W/"abc123"` (rare in APIs)
- Always return ETag header on GET and successful PATCH/PUT responses
- Use `If-Match` for write operations (optimistic lock)
- Use `If-None-Match` for read operations (conditional GET / caching)
- Consider requiring `If-Match` on all PATCH/PUT endpoints (return 428 if missing)
- For version-based ETags, use an auto-incrementing `version` column — simplest approach
- ETags eliminate the need for `updatedAt` timestamp comparisons in most cases

## REST URL Conventions

```
# Resources — plural nouns, never verbs
GET    /api/users              — List users
POST   /api/users              — Create user
GET    /api/users/:id          — Get user (include ETag header)
PATCH  /api/users/:id          — Update user (require If-Match)
PUT    /api/users/:id          — Replace user (require If-Match)
DELETE /api/users/:id          — Delete user

# Nested resources
GET    /api/users/:id/orders   — User's orders
POST   /api/users/:id/orders   — Create order for user

# Actions (when CRUD doesn't fit)
POST   /api/users/:id/activate     — Custom action
POST   /api/orders/:id/cancel      — Custom action
POST   /api/auth/login             — Auth action
POST   /api/auth/refresh           — Token refresh

# Streaming endpoints
GET    /api/events                 — SSE event stream
POST   /api/chat/completions       — AI streaming (POST-based SSE)

# Filtering, sorting, searching
GET    /api/users?status=active&role=admin
GET    /api/users?sort=-createdAt          — Descending
GET    /api/users?sort=name                — Ascending
GET    /api/users?search=erkan
GET    /api/users?fields=id,name,email     — Sparse fields

# Pagination
GET    /api/users?page=2&limit=20
```

### URL Naming Rules

- Use plural nouns: `/users` not `/user`
- Use kebab-case: `/order-items` not `/orderItems`
- Use nouns for resources, verbs only for actions
- Max 2 levels of nesting: `/users/:id/orders` (not deeper)
- Use query params for filtering, not path segments
- Streaming endpoints: use descriptive paths like `/stream`, `/events`, `/completions`

## Pagination

### Offset-Based (Simple)

```typescript
// Request
GET /api/users?page=2&limit=20

// Implementation
const page = Math.max(1, Number(query.page) || 1);
const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
const skip = (page - 1) * limit;

const [items, total] = await Promise.all([
  db.users.findMany({ skip, take: limit, orderBy: { createdAt: "desc" } }),
  db.users.count({ where }),
]);

// Response
{
  "success": true,
  "data": [...],
  "meta": {
    "pagination": {
      "page": 2,
      "limit": 20,
      "total": 156,
      "pageCount": 8,
      "hasNext": true,
      "hasPrev": true
    }
  }
}
```

### Cursor-Based (Scalable)

```typescript
// Request — for infinite scroll, real-time feeds
GET /api/posts?cursor=post_abc123&limit=20

// Implementation
const items = await db.posts.findMany({
  take: limit + 1, // Fetch one extra to check hasNext
  ...(cursor && {
    cursor: { id: cursor },
    skip: 1, // Skip the cursor item
  }),
  orderBy: { createdAt: "desc" },
});

const hasNext = items.length > limit;
if (hasNext) items.pop(); // Remove the extra item

// Response
{
  "success": true,
  "data": [...],
  "meta": {
    "pagination": {
      "nextCursor": "post_xyz789",
      "hasNext": true,
      "limit": 20
    }
  }
}
```

### When to Use Which

```
Offset-based:
  ✅ Admin dashboards, tables with page numbers
  ✅ Small-medium datasets (<100k rows)
  ❌ Slow on large datasets (OFFSET scans rows)

Cursor-based:
  ✅ Infinite scroll, feeds, real-time data
  ✅ Large datasets, consistent performance
  ❌ Can't jump to page N directly
```

## Streaming APIs & SSE

### Server-Sent Events (SSE)

SSE is the backbone of AI/LLM streaming. Simple, HTTP-based, auto-reconnect built-in.

```typescript
// SSE Streaming endpoint pattern
async function streamHandler(req: Request): Promise<Response> {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of generateChunks()) {
        const data = `data: ${JSON.stringify(chunk)}\n\n`;
        controller.enqueue(encoder.encode(data));
      }
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

### Client-Side SSE Consumption

```typescript
// Native EventSource — GET-based SSE
const eventSource = new EventSource("/api/stream");
eventSource.onmessage = (event) => {
  if (event.data === "[DONE]") {
    eventSource.close();
    return;
  }
  const data = JSON.parse(event.data);
  // Process chunk
};

eventSource.onerror = () => {
  // Auto-reconnect is built into EventSource
  console.warn("SSE connection lost, reconnecting...");
};
```

### POST-Based SSE (AI/LLM Pattern)

```typescript
// For POST-based SSE — needed when sending request body (prompts, etc.)
async function fetchStream(prompt: string) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value);
    // Parse SSE lines and process
  }
}
```

### SSE Best Practices

- Use `data: [DONE]\n\n` sentinel to signal stream end
- Include `id:` field for reconnection support — client sends `Last-Event-ID`
- Use `retry:` field to control reconnection interval (milliseconds)
- Keep-alive with periodic `:comment\n\n` to prevent proxy timeouts
- Set `Cache-Control: no-cache` — SSE must not be cached
- For POST-based SSE, use `ReadableStream` + `fetch` (not `EventSource`)

## OpenAPI 3.1 — API-First Design

OpenAPI 3.1 is the standard for API documentation in 2026. It's fully JSON Schema compatible, which means your validation schemas and API docs can share the same definitions. API-first design — write the spec before the code — is now the dominant workflow.

### Basic OpenAPI 3.1 Spec

```yaml
# Prefer OpenAPI 3.1 (JSON Schema compatible)
openapi: "3.1.0"
info:
  title: "My API"
  version: "1.0.0"
  description: "Production API with structured errors and ETags"
paths:
  /api/users:
    get:
      summary: List users
      operationId: listUsers
      parameters:
        - name: page
          in: query
          schema: { type: integer, default: 1 }
        - name: limit
          in: query
          schema: { type: integer, default: 20, maximum: 100 }
        - name: sort
          in: query
          schema: { type: string, enum: ["-createdAt", "name", "-name"] }
      responses:
        "200":
          description: Paginated list of users
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/UserListResponse"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "429":
          $ref: "#/components/responses/RateLimited"

  /api/users/{id}:
    get:
      summary: Get user by ID
      operationId: getUser
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
      responses:
        "200":
          description: User found
          headers:
            ETag:
              schema: { type: string }
              description: Entity tag for conditional requests
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/UserResponse"
        "304":
          description: Not Modified (ETag matched)
        "404":
          $ref: "#/components/responses/NotFound"

    patch:
      summary: Update user
      operationId: updateUser
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string }
        - name: If-Match
          in: header
          required: true
          schema: { type: string }
          description: ETag from previous GET for optimistic concurrency
        - name: Idempotency-Key
          in: header
          schema: { type: string }
          description: Unique key to prevent duplicate updates
      requestBody:
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/UpdateUserInput"
      responses:
        "200":
          description: User updated
          headers:
            ETag:
              schema: { type: string }
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/UserResponse"
        "412":
          description: Precondition Failed (ETag mismatch)
          content:
            application/problem+json:
              schema:
                $ref: "#/components/schemas/ProblemDetails"
```

### Reusable Components

```yaml
components:
  schemas:
    ProblemDetails:
      type: object
      required: [type, title, status]
      properties:
        type: { type: string, format: uri }
        title: { type: string }
        status: { type: integer }
        detail: { type: string }
        instance: { type: string }

    Pagination:
      type: object
      properties:
        page: { type: integer }
        limit: { type: integer }
        total: { type: integer }
        pageCount: { type: integer }
        hasNext: { type: boolean }
        hasPrev: { type: boolean }

  responses:
    Unauthorized:
      description: Missing or invalid authentication
      content:
        application/json:
          schema:
            type: object
            properties:
              success: { type: boolean, const: false }
              error:
                type: object
                properties:
                  message: { type: string }
                  code: { type: string, const: "UNAUTHORIZED" }

    NotFound:
      description: Resource not found
      content:
        application/problem+json:
          schema:
            $ref: "#/components/schemas/ProblemDetails"

    RateLimited:
      description: Rate limit exceeded
      headers:
        Retry-After:
          schema: { type: integer }
      content:
        application/problem+json:
          schema:
            $ref: "#/components/schemas/ProblemDetails"

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

security:
  - bearerAuth: []
```

### OpenAPI 3.1 Best Practices

- Write the spec first, then implement — API-first design catches issues early
- Use `$ref` extensively — DRY schemas, reusable components
- OpenAPI 3.1 supports full JSON Schema draft 2020-12 — use `const`, `prefixItems`, `$dynamicRef`
- Document ETag headers and `If-Match` requirements in the spec
- Include `Idempotency-Key` header in all mutating operations
- Use `application/problem+json` content type for RFC 9457 error responses
- Generate client SDKs from the spec — TypeScript, Python, Go clients for free
- Validate requests against the spec at runtime — catch drift between spec and implementation

## AI-Friendly API Patterns

APIs in 2026 must be designed for both human developers and AI/LLM consumers. Consistent structure, predictable naming, and machine-readable errors make APIs significantly easier for AI agents to use.

### Structured Output Endpoints

```typescript
// Request with JSON schema for structured output
interface AiCompletionRequest {
  prompt: string;
  model?: string;
  stream?: boolean;           // Streaming vs non-streaming variant
  response_format?: {
    type: "json_schema";
    json_schema: {
      name: string;
      schema: Record<string, unknown>;
    };
  };
  idempotency_key?: string;   // Critical for AI retries
}

// Non-streaming response with token usage
{
  "success": true,
  "data": {
    "id": "cmpl_abc123",
    "content": "...",
    "finish_reason": "stop"
  },
  "meta": {
    "usage": {
      "prompt_tokens": 125,
      "completion_tokens": 340,
      "total_tokens": 465
    },
    "model": "gpt-4o",
    "requestId": "req_xyz789"
  }
}
```

### Streaming + Non-Streaming Variants

```typescript
// Same endpoint, behavior controlled by `stream` param
async function handleCompletion(req: Request) {
  const body = await req.json();
  const { prompt, stream = false } = body;

  if (stream) {
    // Return SSE stream
    return streamResponse(prompt);
  }

  // Return standard JSON response
  const result = await generateCompletion(prompt);
  return Response.json({
    success: true,
    data: result,
    meta: { usage: result.usage },
  });
}
```

### Token Usage Tracking

```typescript
// Always include usage in AI endpoint responses
interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd?: number; // Optional cost tracking
}

// Track usage per-request for billing and monitoring
async function trackUsage(userId: string, usage: TokenUsage) {
  await db.apiUsage.create({
    data: {
      userId,
      promptTokens: usage.prompt_tokens,
      completionTokens: usage.completion_tokens,
      totalTokens: usage.total_tokens,
      timestamp: new Date(),
    },
  });
}
```

### Designing APIs for LLM Consumption

```typescript
// AI-friendly API design principles:

// 1. Consistent field naming — always camelCase, never mixed
// Good: { "userId": "123", "createdAt": "..." }
// Bad:  { "user_id": "123", "created_at": "..." } (mixing conventions)

// 2. Predictable envelope — same shape for every endpoint
// AI agents learn the pattern once, apply everywhere
{
  "success": true,
  "data": { /* always here */ },
  "meta": { /* always here for lists */ }
}

// 3. Machine-readable error codes — not just human messages
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",  // AI can switch on this
    "message": "...",            // Human-readable
    "details": [...]             // Structured field errors
  }
}

// 4. Self-describing responses — include type hints
{
  "success": true,
  "data": {
    "id": "usr_123",           // Prefixed IDs indicate resource type
    "type": "user",            // Explicit type field
    "_links": {                // HATEOAS-lite for discoverability
      "self": "/api/users/usr_123",
      "orders": "/api/users/usr_123/orders"
    }
  }
}

// 5. Enum values in responses — not magic numbers
// Good: { "status": "active" }
// Bad:  { "status": 1 }
```

## Authentication Patterns

### JWT Token Flow

```
1. POST /api/auth/login     → { accessToken, refreshToken }
2. GET  /api/users           → Authorization: Bearer <accessToken>
3. POST /api/auth/refresh    → { accessToken } (when expired)
4. POST /api/auth/logout     → Invalidate refreshToken
```

### Auth Header Pattern

```typescript
// Extract and verify token
function getAuthToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

// Auth middleware pattern
async function authenticate(req: Request) {
  const token = getAuthToken(req);
  if (!token) throw new AppError("UNAUTHORIZED", "Missing auth token");

  const payload = await verifyJWT(token);
  if (!payload) throw new AppError("UNAUTHORIZED", "Invalid token");

  return payload; // { userId, role, ... }
}
```

### Role-Based Access

```typescript
// Role hierarchy
const ROLE_LEVEL: Record<string, number> = {
  super_admin: 100,
  admin: 80,
  manager: 60,
  user: 40,
  guest: 20,
};

function requireRole(userRole: string, minRole: string): boolean {
  return (ROLE_LEVEL[userRole] ?? 0) >= (ROLE_LEVEL[minRole] ?? 0);
}

// Usage in route
const user = await authenticate(req);
if (!requireRole(user.role, "admin")) {
  return errorResponse("Forbidden", 403);
}
```

## Rate Limiting

```typescript
// Response headers
{
  "X-RateLimit-Limit": "100",        // Max requests per window
  "X-RateLimit-Remaining": "95",     // Remaining requests
  "X-RateLimit-Reset": "1640000000", // Window reset timestamp
  "Retry-After": "60"                // Seconds until retry (when 429)
}

// Tiered rate limits
const RATE_LIMITS = {
  public: { window: "15m", max: 100 },
  authenticated: { window: "15m", max: 1000 },
  admin: { window: "15m", max: 5000 },
} as const;
```

## Versioning

```
// URL versioning (recommended — explicit, easy to route)
GET /api/v1/users
GET /api/v2/users

// Header versioning (cleaner URLs, harder to test)
GET /api/users
Accept: application/vnd.api.v2+json

// Query param (easy but messy)
GET /api/users?version=2
```

### Versioning Rules

- Default to v1, only add v2 when breaking changes needed
- Keep old versions alive for minimum 6 months
- Document deprecation timeline in response headers
- Breaking changes: removed fields, changed types, new required params
- Non-breaking: new optional fields, new endpoints, new optional params

## Idempotency

Idempotency-Key header is now standard for ALL mutating operations — not just payments. Network retries, client timeouts, and AI agent retries all benefit from idempotency guarantees.

```typescript
// ALL POST/PATCH/PUT/DELETE requests should support idempotency keys
POST /api/users
Headers:
  Idempotency-Key: "unique-request-id-123"

PATCH /api/users/123
Headers:
  Idempotency-Key: "update-user-456"
  If-Match: "etag-abc"

// Server checks if this key was already processed
// If yes → return cached response (same status, same body)
// If no → process and cache response

// Implementation pattern
async function handleIdempotent(
  req: Request,
  handler: () => Promise<Response>
): Promise<Response> {
  const key = req.headers.get("idempotency-key");
  if (!key) {
    // Optionally require idempotency keys for all mutations
    return handler();
  }

  // Check cache
  const cached = await cache.get(`idempotency:${key}`);
  if (cached) {
    // Return exact same response — status, headers, body
    return new Response(cached.body, {
      status: cached.status,
      headers: {
        ...cached.headers,
        "X-Idempotent-Replayed": "true", // Signal this is a replay
      },
    });
  }

  // Process request
  const response = await handler();

  // Cache response (store status + headers + body)
  await cache.set(
    `idempotency:${key}`,
    {
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: await response.clone().text(),
    },
    { ttl: 86400 } // 24h TTL
  );

  return response;
}
```

### Idempotency Best Practices

- Generate keys client-side using UUIDs: `crypto.randomUUID()`
- Cache idempotency responses for 24h minimum
- Return `X-Idempotent-Replayed: true` header when serving cached response
- For AI/LLM endpoints, use longer TTL (completions can take 30s+)
- Store the full response (status + headers + body) — not just the data
- Handle concurrent requests with the same key: lock → process → cache → unlock
- Idempotency + ETags together: idempotency prevents duplicate creates, ETags prevent lost updates

## CORS Configuration

```typescript
// Standard CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGINS || "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Request-ID, If-Match, If-None-Match, Idempotency-Key",
  "Access-Control-Expose-Headers":
    "ETag, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Idempotent-Replayed",
  "Access-Control-Max-Age": "86400", // Cache preflight for 24h
  "Access-Control-Allow-Credentials": "true",
};

// Handle OPTIONS preflight
if (req.method === "OPTIONS") {
  return new Response(null, { status: 204, headers: corsHeaders });
}
```

### CORS Notes

- Expose `ETag` header so clients can read it for optimistic concurrency
- Expose `X-RateLimit-*` headers for client-side rate limit awareness
- Allow `If-Match`, `If-None-Match`, and `Idempotency-Key` in request headers
- Never use `*` for origin in production with credentials
- Cache preflight responses for 24h to reduce OPTIONS requests

## Request Validation Pattern

```typescript
// Validate early, fail fast
async function handleCreateUser(req: Request) {
  // 1. Auth
  const user = await authenticate(req);

  // 2. Idempotency check
  const idempotencyKey = req.headers.get("idempotency-key");

  // 3. Parse body
  const body = await req.json().catch(() => null);
  if (!body) return errorResponse("Invalid JSON", 400);

  // 4. Validate (Zod, Joi, ArkType, Valibot, etc.)
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse("Validation failed", 422, parsed.error.errors);
  }

  // 5. Business logic
  const created = await UserService.create(parsed.data);

  // 6. Response with ETag
  const etag = generateETag(created);
  return new Response(JSON.stringify({ success: true, data: created }), {
    status: 201,
    headers: {
      "Content-Type": "application/json",
      ETag: etag,
    },
  });
}
```

## API Security (2026)

APIs are the #1 attack vector — REST APIs power the majority of web traffic. Security is no longer optional, it's the foundation.

### Zero-Trust API Architecture

```typescript
// Never trust, always verify — every request, every time
async function zeroTrustMiddleware(req: Request) {
  // 1. Verify identity (token, API key, mTLS cert)
  const identity = await verifyIdentity(req);

  // 2. Check permissions per-resource, per-action
  await checkPermission(identity, req.method, req.url);

  // 3. Validate request integrity (schema + ETag for mutations)
  await validateRequestSchema(req);

  // 4. Rate limit per-identity
  await enforceRateLimit(identity.id, req.url);

  // 5. Check idempotency for mutations
  if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
    await checkIdempotency(req);
  }

  // 6. Log for audit trail
  await auditLog(identity, req);
}
```

### API Gateway as Security Layer

```
Client → API Gateway → Backend Services

Gateway responsibilities:
  ✅ Authentication & token validation
  ✅ Rate limiting & throttling
  ✅ Request/response schema validation
  ✅ Bot detection & abuse prevention
  ✅ IP allowlisting / geofencing
  ✅ Request logging & audit trail
  ✅ TLS termination
  ✅ ETag / conditional request handling
```

### Security Checklist

- Validate all input — never trust client data, even from authenticated users
- Use short-lived access tokens (15m) + long-lived refresh tokens (7d)
- Implement per-endpoint rate limiting, not just global
- Log all auth failures and suspicious patterns
- Use API keys for service-to-service, JWT for user-facing
- Rotate secrets and API keys regularly
- Monitor for business-logic abuse (e.g., scraping, enumeration)
- Pin API dependencies — supply chain attacks target API libraries
- Use `Content-Security-Policy` and `Strict-Transport-Security` headers
- Return RFC 9457 Problem Details for security errors — structured, parseable
- Require `If-Match` on update endpoints to prevent race conditions
- Require `Idempotency-Key` on critical mutation endpoints

## Best Practices

- Always return consistent response envelope: `{ success, data, error, meta }`
- Use proper HTTP status codes — don't return 200 for errors
- Validate input at the API boundary, before business logic
- Use plural nouns for resources, kebab-case for multi-word
- Implement pagination on all list endpoints — never return unbounded results
- Use cursor-based pagination for large/real-time datasets
- Include rate limit headers in responses
- Use ETags for optimistic concurrency control on all update endpoints
- Consider RFC 9457 Problem Details for public-facing API errors
- Design APIs to be AI/LLM-friendly with consistent structure and machine-readable error codes
- Use OpenAPI 3.1 for API documentation — JSON Schema compatible, generate SDKs from spec
- Support Idempotency-Key header for ALL mutating operations, not just payments
- Version your API from day one (start with v1)
- Log errors server-side, return safe messages to clients
- Use CORS properly — never `*` in production with credentials
- Expose ETag and rate limit headers via `Access-Control-Expose-Headers`
- Document every endpoint with request/response examples
- Use Zod/Joi/ArkType/Valibot for request validation — never trust client input
- Use SSE for server-to-client streaming — it's simpler than WebSocket for one-way data
- Offer both streaming and non-streaming variants for AI/LLM endpoints
- Track token usage in response meta for AI endpoints — billing and monitoring depend on it
- Adopt zero-trust API security — verify every request, log everything
- Use an API gateway for centralized auth, rate limiting, and bot detection
- Pin and audit API dependencies — supply chain security is a real threat
- Write the OpenAPI spec first, then implement — API-first design catches issues early
- Generate client SDKs from OpenAPI spec — TypeScript, Python, Go clients for free
