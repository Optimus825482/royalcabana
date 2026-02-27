import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

// Soft delete uygulanacak modeller
const SOFT_DELETE_MODELS = [
  "User",
  "Cabana",
  "Reservation",
  "Product",
  "Guest",
  "Staff",
];

function isSoftDeleteModel(model?: string): boolean {
  return !!model && SOFT_DELETE_MODELS.includes(model);
}

function addSoftDeleteFilter(model: string | undefined, args: any): void {
  if (!isSoftDeleteModel(model)) return;
  if (!args.where) args.where = {};
  if (args.where.deletedAt === undefined) {
    args.where.deletedAt = null;
  }
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const base = new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

  const extended = base.$extends({
    query: {
      $allModels: {
        async findMany({ model, args, query }: any) {
          addSoftDeleteFilter(model, args);
          return query(args);
        },
        async findFirst({ model, args, query }: any) {
          addSoftDeleteFilter(model, args);
          return query(args);
        },
        async findUnique({ model, args, query }: any) {
          addSoftDeleteFilter(model, args);
          return query(args);
        },
        async count({ model, args, query }: any) {
          addSoftDeleteFilter(model, args);
          return query(args);
        },
        async delete({ model, args, query }: any) {
          if (isSoftDeleteModel(model)) {
            const delegate = (base as any)[
              model!.charAt(0).toLowerCase() + model!.slice(1)
            ];
            return delegate.update({
              where: args.where,
              data: { deletedAt: new Date() },
            });
          }
          return query(args);
        },
        async deleteMany({ model, args, query }: any) {
          if (isSoftDeleteModel(model)) {
            const delegate = (base as any)[
              model!.charAt(0).toLowerCase() + model!.slice(1)
            ];
            return delegate.updateMany({
              where: args.where,
              data: { deletedAt: new Date() },
            });
          }
          return query(args);
        },
      },
    },
  });

  return extended;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
