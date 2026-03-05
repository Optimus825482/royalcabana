import { z } from "zod";

// ===== Reservation Extra Request Item =====

export const extraRequestItemSchema = z
  .object({
    type: z.enum(["PRODUCT", "CUSTOM"]),
    productId: z.string().min(1).optional().nullable(),
    customName: z
      .string()
      .min(1, "Talep adı zorunludur.")
      .optional()
      .nullable(),
    customDesc: z.string().optional().nullable(),
    quantity: z.number().int().positive("Miktar pozitif olmalıdır.").default(1),
  })
  .refine(
    (d) => {
      if (d.type === "PRODUCT") return !!d.productId;
      if (d.type === "CUSTOM") return !!d.customName;
      return false;
    },
    {
      message:
        "PRODUCT tipinde productId, CUSTOM tipinde customName zorunludur.",
    },
  );

// ===== Reservation =====

export const createReservationSchema = z.object({
  cabanaId: z.string().min(1, "Cabana seçimi zorunludur."),
  guestName: z.string().min(2, "Misafir adı en az 2 karakter olmalıdır."),
  guestId: z.string().optional().nullable(),
  startDate: z.string().min(1, "Başlangıç tarihi zorunludur."),
  endDate: z.string().min(1, "Bitiş tarihi zorunludur."),
  notes: z.string().optional().nullable(),
  conceptId: z.string().optional().nullable(),
  minibarTypeId: z.string().optional().nullable(),
  extraItems: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive(),
      }),
    )
    .optional()
    .default([]),
  customRequests: z.string().optional().nullable(),
  extraRequests: z.array(extraRequestItemSchema).optional().default([]),
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

// ===== Reservation Extra Request Price/Action =====

export const extraRequestPriceSchema = z
  .object({
    action: z.enum(["approve", "reject", "price"]),
    unitPrice: z.number().nonnegative("Fiyat negatif olamaz.").optional(),
    rejectionReason: z.string().min(1, "Red nedeni zorunludur.").optional(),
  })
  .refine(
    (d) => {
      if (d.action === "reject") return !!d.rejectionReason;
      if (d.action === "price")
        return d.unitPrice !== undefined && d.unitPrice !== null;
      return true;
    },
    { message: "Reject için neden, price için fiyat zorunludur." },
  );

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

// ===== Guest =====

export const createGuestSchema = z.object({
  name: z.string().min(2, "Misafir adı en az 2 karakter olmalıdır."),
  phone: z.string().optional().nullable(),
  email: z
    .string()
    .email("Geçerli bir e-posta adresi giriniz.")
    .optional()
    .nullable(),
  vipLevel: z.enum(["STANDARD", "SILVER", "GOLD", "PLATINUM"]).optional(),
  notes: z.string().optional().nullable(),
  isBlacklisted: z.boolean().optional(),
});

export const updateGuestSchema = createGuestSchema.partial();

// ===== FnB Order =====

export const createFnbOrderSchema = z.object({
  reservationId: z.string().min(1, "Rezervasyon seçimi zorunludur."),
  cabanaId: z.string().min(1, "Cabana seçimi zorunludur."),
  notes: z.string().optional().nullable(),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive("Miktar pozitif olmalıdır."),
        unitPrice: z.number().nonnegative("Fiyat negatif olamaz."),
      }),
    )
    .min(1, "En az bir ürün gereklidir."),
});

// ===== BlackoutDate =====

export const createBlackoutDateSchema = z.object({
  cabanaId: z.string().optional().nullable(),
  startDate: z.string().min(1, "Başlangıç tarihi zorunludur."),
  endDate: z.string().min(1, "Bitiş tarihi zorunludur."),
  reason: z.string().optional().nullable(),
});

// ===== Waitlist =====

export const createWaitlistSchema = z.object({
  cabanaId: z.string().min(1, "Cabana seçimi zorunludur."),
  guestName: z.string().min(2, "Misafir adı en az 2 karakter olmalıdır."),
  desiredStart: z.string().min(1, "Başlangıç tarihi zorunludur."),
  desiredEnd: z.string().min(1, "Bitiş tarihi zorunludur."),
  notes: z.string().optional().nullable(),
});

// ===== RecurringBooking =====

export const createRecurringBookingSchema = z.object({
  cabanaId: z.string().min(1, "Cabana seçimi zorunludur."),
  guestName: z.string().min(2, "Misafir adı en az 2 karakter olmalıdır."),
  pattern: z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]),
  dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
  dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
  startDate: z.string().min(1, "Başlangıç tarihi zorunludur."),
  endDate: z.string().min(1, "Bitiş tarihi zorunludur."),
});

// ===== Staff =====

export const createStaffSchema = z.object({
  name: z.string().min(2, "Personel adı en az 2 karakter olmalıdır."),
  phone: z.string().optional().nullable(),
  email: z
    .string()
    .email("Geçerli bir e-posta adresi giriniz.")
    .optional()
    .nullable(),
  position: z.string().min(1, "Pozisyon zorunludur."),
});

export const createStaffAssignmentSchema = z.object({
  staffId: z.string().min(1, "Personel seçimi zorunludur."),
  cabanaId: z.string().min(1, "Cabana seçimi zorunludur."),
  date: z.string().min(1, "Tarih zorunludur."),
  shift: z.string().optional().nullable(),
});

export const createStaffTaskSchema = z.object({
  staffId: z.string().min(1, "Personel seçimi zorunludur."),
  taskDefinitionId: z.string().optional().nullable(),
  title: z.string().min(1, "Görev başlığı zorunludur."),
  description: z.string().optional().nullable(),
  date: z.string().min(1, "Tarih zorunludur."),
});

// ===== Stock =====

export const updateStockSchema = z.object({
  productId: z.string().min(1, "Ürün seçimi zorunludur."),
  stockQuantity: z.number().int().min(0, "Stok miktarı negatif olamaz."),
  minStockAlert: z
    .number()
    .int()
    .min(0, "Minimum stok uyarısı negatif olamaz."),
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

// ===== Review =====

export const createReviewSchema = z.object({
  reservationId: z.string().min(1, "Rezervasyon seçimi zorunludur."),
  rating: z.number().int().min(1).max(5, "Puan 1-5 arasında olmalıdır."),
  comment: z.string().optional().nullable(),
});
