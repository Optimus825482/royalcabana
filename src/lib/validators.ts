import { z } from "zod";

// ===== Reservation =====

export const createReservationSchema = z.object({
  cabanaId: z.string().min(1, "Kabana seçimi zorunludur."),
  guestName: z.string().min(2, "Misafir adı en az 2 karakter olmalıdır."),
  startDate: z.string().min(1, "Başlangıç tarihi zorunludur."),
  endDate: z.string().min(1, "Bitiş tarihi zorunludur."),
  notes: z.string().optional().nullable(),
});

export const approveReservationSchema = z.object({
  totalPrice: z
    .number({ error: "Toplam fiyat zorunludur." })
    .nonnegative("Fiyat negatif olamaz."),
});

export const rejectReservationSchema = z.object({
  reason: z.string().min(1, "Red nedeni zorunludur."),
});

// ===== Modification Request =====

export const modificationRequestSchema = z
  .object({
    newCabanaId: z.string().optional().nullable(),
    newStartDate: z.string().optional().nullable(),
    newEndDate: z.string().optional().nullable(),
    newGuestName: z.string().optional().nullable(),
  })
  .refine(
    (data) =>
      data.newCabanaId ||
      data.newStartDate ||
      data.newEndDate ||
      data.newGuestName,
    { message: "En az bir değişiklik alanı belirtilmelidir." },
  );

// ===== Cancellation Request =====

export const cancellationRequestSchema = z.object({
  reason: z.string().min(1, "İptal nedeni zorunludur."),
});

// ===== Extra Concept Request (JSON field validation) =====

export const extraConceptItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive("Miktar pozitif olmalıdır."),
  unitPrice: z.number().nonnegative("Fiyat negatif olamaz."),
});

export const extraConceptRequestSchema = z.object({
  items: z.array(extraConceptItemSchema).min(1, "En az bir ürün gereklidir."),
});

// ===== Notification Metadata (JSON field validation) =====

export const notificationMetadataSchema = z
  .object({
    reservationId: z.string().optional(),
    cabanaName: z.string().optional(),
    actionUrl: z.string().optional(),
  })
  .passthrough();

// ===== Product =====

export const createProductSchema = z.object({
  name: z.string().min(2, "Ürün adı en az 2 karakter olmalıdır."),
  purchasePrice: z.number().nonnegative(),
  salePrice: z.number().nonnegative(),
  groupId: z.string().optional().nullable(),
});

// ===== Concept =====

export const createConceptSchema = z.object({
  name: z.string().min(2, "Konsept adı en az 2 karakter olmalıdır."),
  description: z.string().min(1, "Açıklama zorunludur."),
  classId: z.string().optional().nullable(),
});

// ===== Helper =====

export function parseBody<T>(schema: z.ZodSchema<T>, data: unknown) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstError = result.error.issues[0]?.message ?? "Geçersiz veri.";
    return { success: false as const, error: firstError };
  }
  return { success: true as const, data: result.data };
}
