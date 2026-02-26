import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Soft delete uygulanacak modeller
const SOFT_DELETE_MODELS = ["User", "Cabana", "Reservation", "Product"];

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const client = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

  // Soft delete middleware — findMany/findFirst otomatik filtreleme
  client.$use(async (params, next) => {
    if (!params.model || !SOFT_DELETE_MODELS.includes(params.model)) {
      return next(params);
    }

    // Okuma sorgularında deletedAt = null filtresi ekle
    if (
      params.action === "findMany" ||
      params.action === "findFirst" ||
      params.action === "findUnique" ||
      params.action === "count"
    ) {
      if (!params.args) params.args = {};
      if (!params.args.where) params.args.where = {};
      // Kullanıcı açıkça deletedAt filtresi verdiyse dokunma
      if (params.args.where.deletedAt === undefined) {
        params.args.where.deletedAt = null;
      }
    }

    // delete → soft delete'e çevir
    if (params.action === "delete") {
      params.action = "update";
      params.args.data = { deletedAt: new Date() };
    }

    // deleteMany → soft deleteMany'e çevir
    if (params.action === "deleteMany") {
      params.action = "updateMany";
      if (!params.args) params.args = {};
      params.args.data = { deletedAt: new Date() };
    }

    return next(params);
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
