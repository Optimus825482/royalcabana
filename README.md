# Royal Cabana - Beach Resort Management System

A comprehensive beach resort management application for Royal Cabana, a luxury beach club in Antalya, Turkey. The system manages cabana reservations, food & beverage orders, staff assignments, guest databases, and real-time notifications.

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16.1.6 (App Router) |
| Language | TypeScript 5 |
| Database | PostgreSQL 16 + Prisma ORM 7 |
| Cache/Rate Limiting | Redis 7 (ioredis) |
| Authentication | NextAuth.js 4 (JWT) |
| Real-time | Socket.io 4 + Server-Sent Events (SSE) |
| UI | Tailwind CSS 4 + shadcn/ui (radix-ui) |
| 3D Visualization | Three.js (@react-three/fiber, @react-three/drei) |
| State Management | Zustand (client) + TanStack Query (server) |
| Validation | Zod 4 |
| i18n | next-intl 4 (Turkish UI) |
| Email | Nodemailer 7 |
| Push Notifications | web-push |
| Reports | Slidev, jsPDF, pptxgenjs, xlsx |
| Containerization | Docker + Docker Compose |

## Key Features

### Reservation Management

- Cabana and beach bed reservations with calendar interface
- Reservation status workflow (PENDING, APPROVED, REJECTED, CHECKED_IN, CHECKED_OUT)
- Modification and cancellation request handling
- Extra concept requests (additional services)
- Recurring booking patterns (weekly, biweekly, monthly)
- Waitlist management for fully booked slots
- Guest check-in/check-out tracking

### Cabana Management

- 3D map visualization with React Three Fiber
- Cabana classes and concepts (service categories)
- Dynamic pricing by season and cabana type
- QR code generation for cabanas
- Blackout dates for maintenance blocks
- Coordinate-based placement on interactive map

### Food & Beverage (F&B)

- Integrated F&B ordering within reservations
- Order status tracking (PREPARING, READY, DELIVERED, CANCELLED)
- Product catalog with stock management
- Minibar type configurations

### Staff Management

- Staff profiles with positions
- Cabana assignments by date and shift
- Task definitions and staff task tracking
- Service point staff assignments
- Role-based permissions (Barmen, Garson, Kasiyer)

### Service Points

- Multiple service point types (BAR, RESTAURANT, POOL_BAR, BEACH_BAR, SPA)
- Coordinate-based map placement
- Required staff count per point
- Staff role requirements

### Guest Management

- Guest database with contact information
- VIP level tracking (STANDARD, SILVER, GOLD, PLATINUM)
- Blacklist management
- Visit history tracking
- Reservation history

### Pricing & Products

- Product groups and individual products
- Concept-based product associations
- Extra services with category groupings
- Extra service price history
- Dynamic pricing calculations

### Reporting

- Slidev-based presentation generation
- PDF and Excel export capabilities
- Multiple report types
- Presentation preview functionality

### Notifications

- Real-time notifications via Socket.io
- Web push notifications
- SSE endpoint for live updates
- Email notifications (Nodemailer)
- In-app notification popup

### Audit & Security

- Comprehensive audit logging
- Login session tracking with device info
- Role-based access control (RBAC)
- Permission system with granular actions
- Rate limiting on API and socket events

## User Roles

| Role | Description |
|------|-------------|
| SYSTEM_ADMIN | Full system access, all permissions |
| ADMIN | General administration access |
| CASINO_ADMIN | Casino area administration |
| CASINO_USER | Casino staff reservations |
| FNB_USER | Food & beverage staff |

## Project Structure

```
src/
├── app/
│   ├── (auth)/                  # Authentication pages
│   ├── (dashboard)/             # Main dashboard pages
│   │   ├── admin/              # Admin dashboard
│   │   ├── casino/             # Casino area pages
│   │   ├── casino-admin/       # Casino admin pages
│   │   ├── fnb/                # Food & beverage pages
│   │   ├── profile/            # User profile
│   │   ├── reports/            # Reporting pages
│   │   ├── system-admin/       # System admin pages
│   │   └── weather/            # Weather display
│   └── api/                    # API routes (150+ endpoints)
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── calendar/               # Reservation calendar
│   ├── map/                    # 3D map components
│   ├── reports/                # Report components
│   ├── service-points/         # Service point components
│   └── shared/                 # Shared components
├── hooks/                     # Custom React hooks
├── i18n/                      # Internationalization (tr, en)
├── lib/                       # Core utilities
│   ├── auth.ts                # NextAuth configuration
│   ├── api-middleware.ts      # withAuth wrapper + RBAC
│   ├── prisma.ts              # Prisma client singleton
│   ├── redis.ts               # Redis client
│   ├── socket.ts              # Socket.io client
│   ├── sse.ts                 # SSE utilities
│   ├── audit.ts               # Audit logging
│   ├── email.ts               # Email sending
│   ├── push.ts                # Push notifications
│   └── errors.ts              # Error handling
├── services/                  # Business logic layer
└── types/                     # TypeScript types

socket-server/                 # Separate Socket.io server
├── index.ts                   # Socket.io server entry

prisma/
├── schema.prisma              # Database schema (40+ models)
└── seed.ts                    # Database seed data
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16
- Redis 7
- Docker & Docker Compose (for deployment)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration.

4. Set up the database:

```bash
# Run migrations
npm run db:migrate

# Seed the database (optional)
npm run db:seed
```

5. Start the development server:

```bash
npm run dev
```

The application runs on `http://localhost:3006` with:

- Next.js dev server
- Redis server
- Socket.io server (port 3007)

### Docker Deployment

```bash
docker-compose up -d
```

## API Endpoints Overview

The API follows RESTful conventions with the following patterns:

| Resource | Endpoints |
|----------|-----------|
| Reservations | `/api/reservations/*` |
| Cabanas | `/api/cabanas/*` |
| Guests | `/api/guests/*` |
| Products | `/api/products/*` |
| Product Groups | `/api/product-groups/*` |
| Classes | `/api/classes/*` |
| Concepts | `/api/concepts/*` |
| Extra Services | `/api/extra-services/*` |
| F&B Orders | `/api/fnb/orders/*` |
| Staff | `/api/staff/*` |
| Service Points | `/api/service-points/*` |
| Users | `/api/users/*` |
| Notifications | `/api/notifications/*` |
| Reports | `/api/reports/*` |
| System | `/api/system/*` |

### API Response Format

All API responses follow a consistent format:

```typescript
// Success
{ success: true, data: {...}, error: null }

// Error
{ success: false, data: null, error: "Error message" }
```

### Authentication

API routes use JWT authentication via NextAuth. Include the session token in request headers:

```
Authorization: Bearer <token>
```

### Rate Limiting

- API routes: Rate limited via Redis
- Socket.io events: In-memory rate limiter per user

## Development

### Code Quality Checks

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Build check
npm run build
```

### Database Operations

```bash
# Create migration
npm run db:migrate

# Deploy migrations
npm run db:migrate:deploy

# Reset database
npm run db:reset

# Seed database
npm run db:seed
```

## Environment Variables

See `.env.example` for the complete list of required environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `NEXTAUTH_SECRET` - NextAuth secret for JWT signing
- `NEXTAUTH_URL` - Application URL
- `NEXT_PUBLIC_APP_URL` - Public app URL
- `NEXT_PUBLIC_SOCKET_URL` - Socket server URL
- `INTERNAL_API_SECRET` - Internal API authentication
- `SMTP_*` - Email configuration
- `VAPID_*` - Push notification keys

## Architecture Notes

### Soft Delete Pattern

All models use soft delete with `isDeleted` and `deletedAt` fields. Hard deletes are prohibited.

### Decimal Fields

Price and amount fields use `Decimal` type (not Float) for precision.

### Audit Logging

All mutation operations are logged via `logAudit()` function with entity, action, old/new values.

### Role-Based Access Control

The `withAuth()` middleware wrapper handles authentication, role checking, and permission verification.

## Deployment

The application is designed for Docker deployment with:

- `Dockerfile` - Next.js application
- `Dockerfile.socket` - Socket.io server
- `docker-compose.yaml` - Full stack (app, postgres, redis, socket)
- `docker-entrypoint.sh` - Application startup script

## License

Private - All rights reserved
