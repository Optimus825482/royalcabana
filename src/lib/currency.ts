/**
 * Currency utility — tüm fiyat formatlama bu dosyadan yapılır.
 * SystemConfig'den gelen `system_currency` key'ine göre çalışır.
 */

export type CurrencyCode = "TRY" | "EUR" | "USD";

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  locale: string;
  label: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  TRY: { code: "TRY", symbol: "₺", locale: "tr-TR", label: "Türk Lirası (₺)" },
  EUR: { code: "EUR", symbol: "€", locale: "de-DE", label: "Euro (€)" },
  USD: { code: "USD", symbol: "$", locale: "en-US", label: "US Dolar ($)" },
};

export const DEFAULT_CURRENCY: CurrencyCode = "TRY";

/**
 * Sayısal değeri para birimi formatında gösterir.
 * @example formatPrice(1500, "TRY") → "₺1.500,00"
 */
export function formatPrice(
  value: number | string | null | undefined,
  currencyCode: CurrencyCode = DEFAULT_CURRENCY,
): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (isNaN(num)) return `0 ${CURRENCIES[currencyCode].symbol}`;
  const info = CURRENCIES[currencyCode] ?? CURRENCIES.TRY;
  return num.toLocaleString(info.locale, {
    style: "currency",
    currency: info.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Kısa sembol döndürür: ₺, €, $
 */
export function currencySymbol(
  currencyCode: CurrencyCode = DEFAULT_CURRENCY,
): string {
  return CURRENCIES[currencyCode]?.symbol ?? "₺";
}

/**
 * SystemConfig'den currency okumak için fetch helper.
 * Client component'lerde kullanılır.
 */
export async function fetchSystemCurrency(): Promise<CurrencyCode> {
  try {
    const res = await fetch("/api/system/config/system_currency");
    if (!res.ok) return DEFAULT_CURRENCY;
    const data = await res.json();
    const val = data?.data?.value ?? data?.value ?? DEFAULT_CURRENCY;
    if (val === "TRY" || val === "EUR" || val === "USD") return val;
    return DEFAULT_CURRENCY;
  } catch {
    return DEFAULT_CURRENCY;
  }
}
