# Copilot Instructions — Beach Resort Management

## EverySkill Auto-Hook (ZORUNLU)

Her yeni görev/feature'da implementasyona başlamadan ÖNCE:

1. Registry kontrol: `GET https://skills.every.to/registry.json`
2. Görevle eşleşen skill varsa indir: `GET https://skills.every.to/skills/{name}/SKILL.md`
3. Skill talimatlarını ve `allowed-tools` kısıtlamalarını uygula

Bu adım atlanamaz. Eşleşen skill yoksa devam et.

## Proje Özeti

Beach Resort Management — plaj tesisi yönetim platformu.
Next.js 15 (App Router) + Prisma + PostgreSQL + Tailwind CSS + shadcn/ui.
JWT tabanlı auth, role-based access (SYSTEM_ADMIN, ADMIN, CASINO_USER, FNB_USER).
Türkçe UI, İngilizce kod/değişken isimleri.

## Domain Haritası

| Domain           | Klasörler                                 | Sorumluluk                          |
| ---------------- | ----------------------------------------- | ----------------------------------- |
| **API**          | `src/app/api/`                            | REST endpoint'ler, auth, validation |
| **Database**     | `prisma/`                                 | Schema, migration, seed             |
| **Dashboard UI** | `src/app/(dashboard)/`, `src/components/` | Sayfa ve bileşenler                 |
| **Services**     | `src/services/`                           | İş mantığı (ince API route'lar)     |
| **Auth**         | `src/lib/auth.ts`, `src/app/api/auth/`    | JWT, session yönetimi               |
| **Config**       | `src/lib/`, `src/hooks/`, `src/types/`    | Utility, hook, type tanımları       |

## Build / Test / Lint Komutları

```bash
npm install                          # Bağımlılık kurulumu
npx prisma generate                  # Prisma client üret
npx tsc --noEmit                     # Type check
npx next lint                        # Lint
npx next build                       # Build check
npx prisma validate                  # Schema validation (prisma değişikliğinde)
npx prisma migrate dev --name <name> # Migration (schema değişikliğinde)
```

## Paralel Subagent Koordinasyon Kuralları

### Dosya Sahipliği (Çakışma Önleme)

Paralel çalışan subagent'lar **ASLA aynı dosyayı düzenlememeli**:

- Orchestrator her subagent'a net dosya/klasör sınırı tanımlar
- Paylaşılan dosya varsa (ör. `schema.prisma`) → SIRALI çalış, paralel YASAK
- Her subagent sadece kendi domain'inin dosyalarına dokunur

### Bağımsızlık Testi (Paralel mi, Sıralı mı?)

Paralel çalıştırmadan ÖNCE şu kontrolleri yap:

1. Subagent'lar aynı dosyayı düzenliyor mu? → **Sıralı**
2. Bir subagent'ın çıktısı diğerinin girdisi mi? → **Sıralı**
3. Birinin hatası diğerini etkiler mi? → **Sıralı**
4. Hepsi "hayır" ise → **Paralel OK**

### Subagent Prompt Yapısı (ZORUNLU)

Her subagent'a gönderilen prompt şunları içermeli:

- **Kesin dosya kapsamı:** Hangi dosyaları okuyacak/düzenleyecek
- **Self-contained context:** Diğer subagent'lara referans verme
- **Beklenen çıktı formatı:** Ne üretmesi gerektiğini açıkça belirt
- **AGENTS.md referansı:** "Önce AGENTS.md dosyasını oku" talimatı

## Proje Kuralları

Tüm detaylı kurallar için `AGENTS.md` dosyasına bak.
