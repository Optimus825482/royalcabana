export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id?: string) {
    super(
      id ? `${entity} bulunamadı: ${id}` : `${entity} bulunamadı`,
      "NOT_FOUND",
      404,
    );
    this.name = "NotFoundError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", 400, details);
    this.name = "ValidationError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, "CONFLICT", 409);
    this.name = "ConflictError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Bu işlem için yetkiniz yok") {
    super(message, "FORBIDDEN", 403);
    this.name = "ForbiddenError";
  }
}

export class DatabaseError extends AppError {
  constructor(
    message = "Veritabanı hatası",
    details?: Record<string, unknown>,
  ) {
    super(message, "DATABASE_ERROR", 500, details);
    this.name = "DatabaseError";
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
