---
applyTo: "src/services/**"
---

# Service Layer Kuralları

## Mimari Prensibi

API route'lar İNCE tutulur — iş mantığı buraya yazılır.
Route'lar sadece: auth kontrolü → service çağrısı → response döndürme.

## Pattern

```typescript
// Service: İş mantığı + Prisma sorguları
export class SomeService {
  async getItems(filters: FilterDto) { ... }
  async createItem(data: CreateDto) { ... }
}
export const someService = new SomeService(); // Singleton export

// API Route: Sadece orkestrasyon
export const GET = withAuth([Role.ADMIN], async (req, { session }) => {
  const result = await someService.getItems(filters);
  return NextResponse.json({ success: true, data: result });
});
```

## Kurallar

- Her service tek bir domain'e odaklanır (Single Responsibility)
- Prisma çağrıları service içinde, route içinde DEĞİL
- Error handling: Service hata fırlatır, route yakalar ve `{ success: false, error }` döner
- Soft delete: `where: { isDeleted: false }` her sorguda
- Decimal alanlar: Service'ten dönerken dikkat — JSON'da string olur

## Mevcut Service'ler

- `rbac.service.ts` — Role-based access control bootstrap
- `report.service.ts` — Rapor üretimi (PDF/Excel export)
- `notification.service.ts` — Bildirim yönetimi
- `presentation.service.ts` — Sunum üretimi

## Test

- Service'ler bağımsız test edilebilir (mock Prisma client ile)
- Business logic testleri burada yazılır
