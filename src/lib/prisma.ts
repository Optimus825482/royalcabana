import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

type QueryHookArgs = {
  model?: string;
  args: { where?: Record<string, unknown> } & Record<string, unknown>;
  query: (args: { where?: Record<string, unknown> } & Record<string, unknown>) => unknown;
};

type SoftDeleteDelegate = {
  findFirst: (args: { where?: Record<string, unknown> } & Record<string, unknown>) => unknown;
  findFirstOrThrow: (args: { where?: Record<string, unknown> } & Record<string, unknown>) => unknown;
  update: (args: {
    where: Record<string, unknown>;
    data: Record<string, unknown>;
  }) => unknown;
  updateMany: (args: {
    where?: Record<string, unknown>;
    data: Record<string, unknown>;
  }) => unknown;
};

// Soft delete uygulanacak modeller
// Not: deletedAt: null sorgulaması ile aktif kayıtları filtrele
const SOFT_DELETE_MODELS = new Set([
  "User",
  "Cabana",
  "Reservation",
  "Product",
  "Guest",
  "Staff",
  "ServicePoint",
  "ExtraService",
  "CabanaClass",
  "Concept",
  "ProductGroup",
  "Review",
  "BlackoutDate",
  "Notification",
  "MinibarType",
  "RoleDefinition",
  "Permission",
  "RolePermission",
  "TaskDefinition",
]);

function isSoftDeleteModel(model?: string): boolean {
  return !!model && SOFT_DELETE_MODELS.has(model);
}

function addSoftDeleteFilter(
  model: string | undefined,
  args: { where?: Record<string, unknown> } & Record<string, unknown>,
): void {
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
        async findMany({
          model,
          args,
          query,
        }: {
          model?: string;
          args: { where?: Record<string, unknown> } & Record<string, unknown>;
          query: (args: { where?: Record<string, unknown> } & Record<string, unknown>) => unknown;
        }) {
          addSoftDeleteFilter(model, args);
          return query(args);
        },
        async findFirst({
          model,
          args,
          query,
        }: {
          model?: string;
          args: { where?: Record<string, unknown> } & Record<string, unknown>;
          query: (args: { where?: Record<string, unknown> } & Record<string, unknown>) => unknown;
        }) {
          addSoftDeleteFilter(model, args);
          return query(args);
        },
        async findUnique({ model, args, query }: QueryHookArgs) {
          if (!isSoftDeleteModel(model)) {
            return query(args);
          }

          const delegate = (base as unknown as Record<string, SoftDeleteDelegate>)[
            model!.charAt(0).toLowerCase() + model!.slice(1)
          ];

          return delegate.findFirst({
            ...args,
            where: {
              ...(args?.where ?? {}),
              deletedAt: null,
            },
          });
        },
        async findUniqueOrThrow({ model, args, query }: QueryHookArgs) {
          if (!isSoftDeleteModel(model)) {
            return query(args);
          }

          const delegate = (base as unknown as Record<string, SoftDeleteDelegate>)[
            model!.charAt(0).toLowerCase() + model!.slice(1)
          ];

          return delegate.findFirstOrThrow({
            ...args,
            where: {
              ...(args?.where ?? {}),
              deletedAt: null,
            },
          });
        },
        async count({
          model,
          args,
          query,
        }: {
          model?: string;
          args: { where?: Record<string, unknown> } & Record<string, unknown>;
          query: (args: { where?: Record<string, unknown> } & Record<string, unknown>) => unknown;
        }) {
          addSoftDeleteFilter(model, args);
          return query(args);
        },
        async delete({
          model,
          args,
          query,
        }: {
          model?: string;
          args: { where: Record<string, unknown> };
          query: (args: { where: Record<string, unknown> }) => unknown;
        }) {
          if (isSoftDeleteModel(model)) {
            const delegate = (base as unknown as Record<string, SoftDeleteDelegate>)[
              model!.charAt(0).toLowerCase() + model!.slice(1)
            ];
            return delegate.update({
              where: args.where,
              data: { deletedAt: new Date(), isDeleted: true },
            });
          }
          return query(args);
        },
        async deleteMany({
          model,
          args,
          query,
        }: {
          model?: string;
          args: { where?: Record<string, unknown> };
          query: (args: { where?: Record<string, unknown> }) => unknown;
        }) {
          if (isSoftDeleteModel(model)) {
            const delegate = (base as unknown as Record<string, SoftDeleteDelegate>)[
              model!.charAt(0).toLowerCase() + model!.slice(1)
            ];
            return delegate.updateMany({
              where: { ...args.where, deletedAt: null },
              data: { deletedAt: new Date(), isDeleted: true },
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
