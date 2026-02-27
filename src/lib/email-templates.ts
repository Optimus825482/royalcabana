// Royal Cabana — Email Templates (Turkish)

type TemplateResult = { subject: string; html: string };

const BRAND = {
  gold: "#d4a853",
  goldLight: "#e8c97a",
  surface: "#1a1a1a",
  surfaceElevated: "#262626",
  border: "#333333",
  textPrimary: "#f0f0f0",
  textSecondary: "#a0a0a0",
  textMuted: "#707070",
  success: "#4ade80",
  danger: "#f87171",
  warning: "#fbbf24",
} as const;

function layout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background-color:${BRAND.surface};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.surface};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:${BRAND.surfaceElevated};border:1px solid ${BRAND.border};border-radius:12px;overflow:hidden;">
  <tr><td style="padding:28px 32px;text-align:center;border-bottom:1px solid ${BRAND.border};">
    <span style="font-size:24px;font-weight:700;color:${BRAND.gold};letter-spacing:1px;">ROYAL CABANA</span>
  </td></tr>
  <tr><td style="padding:32px;">${content}</td></tr>
  <tr><td style="padding:20px 32px;text-align:center;border-top:1px solid ${BRAND.border};">
    <p style="margin:0;font-size:12px;color:${BRAND.textMuted};">Royal Cabana &copy; ${new Date().getFullYear()}</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function heading(text: string): string {
  return `<h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:${BRAND.textPrimary};">${text}</h2>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${BRAND.textSecondary};">${text}</p>`;
}

function infoRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:8px 12px;font-size:14px;color:${BRAND.textMuted};white-space:nowrap;">${label}</td>
    <td style="padding:8px 12px;font-size:14px;color:${BRAND.textPrimary};font-weight:500;">${value}</td>
  </tr>`;
}

function infoTable(rows: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background-color:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:8px;">${rows}</table>`;
}

function badge(text: string, color: string): string {
  return `<span style="display:inline-block;padding:4px 14px;font-size:13px;font-weight:600;color:${BRAND.surface};background-color:${color};border-radius:20px;">${text}</span>`;
}

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ── Template Functions ──────────────────────────────────────────────

export function reservationApprovedTemplate(data: {
  guestName: string;
  cabanaName: string;
  startDate: Date | string;
  endDate: Date | string;
}): TemplateResult {
  return {
    subject: `Rezervasyonunuz Onaylandı — ${data.cabanaName}`,
    html: layout(
      "Rezervasyon Onaylandı",
      [
        heading("Rezervasyonunuz Onaylandı! ✓"),
        paragraph(
          `Merhaba <strong style="color:${BRAND.textPrimary}">${data.guestName}</strong>,`,
        ),
        paragraph(
          "Rezervasyonunuz başarıyla onaylanmıştır. Detaylar aşağıdadır:",
        ),
        infoTable(
          [
            infoRow("Cabana", data.cabanaName),
            infoRow("Giriş", formatDate(data.startDate)),
            infoRow("Çıkış", formatDate(data.endDate)),
          ].join(""),
        ),
        `<div style="text-align:center;margin-top:20px;">${badge("ONAYLANDI", BRAND.success)}</div>`,
        `<div style="margin-top:24px;">${paragraph("İyi tatiller dileriz!")}</div>`,
      ].join(""),
    ),
  };
}

export function reservationRejectedTemplate(data: {
  guestName: string;
  cabanaName: string;
  reason: string;
}): TemplateResult {
  return {
    subject: `Rezervasyon Talebi Reddedildi — ${data.cabanaName}`,
    html: layout(
      "Rezervasyon Reddedildi",
      [
        heading("Rezervasyon Talebi Reddedildi"),
        paragraph(
          `Merhaba <strong style="color:${BRAND.textPrimary}">${data.guestName}</strong>,`,
        ),
        paragraph(
          `<strong>${data.cabanaName}</strong> için yaptığınız rezervasyon talebi maalesef reddedilmiştir.`,
        ),
        infoTable(infoRow("Sebep", data.reason)),
        `<div style="text-align:center;margin-top:20px;">${badge("REDDEDİLDİ", BRAND.danger)}</div>`,
        `<div style="margin-top:24px;">${paragraph("Farklı tarihler için yeni bir talep oluşturabilirsiniz.")}</div>`,
      ].join(""),
    ),
  };
}

export function reservationCancelledTemplate(data: {
  guestName: string;
  cabanaName: string;
}): TemplateResult {
  return {
    subject: `Rezervasyon İptal Edildi — ${data.cabanaName}`,
    html: layout(
      "Rezervasyon İptal Edildi",
      [
        heading("Rezervasyonunuz İptal Edildi"),
        paragraph(
          `Merhaba <strong style="color:${BRAND.textPrimary}">${data.guestName}</strong>,`,
        ),
        paragraph(
          `<strong>${data.cabanaName}</strong> için olan rezervasyonunuz iptal edilmiştir.`,
        ),
        `<div style="text-align:center;margin-top:20px;">${badge("İPTAL EDİLDİ", BRAND.warning)}</div>`,
        `<div style="margin-top:24px;">${paragraph("Sorularınız için bizimle iletişime geçebilirsiniz.")}</div>`,
      ].join(""),
    ),
  };
}

export function newRequestNotificationTemplate(data: {
  guestName: string;
  cabanaName: string;
  startDate: Date | string;
  endDate: Date | string;
  requestedBy: string;
}): TemplateResult {
  return {
    subject: `Yeni Rezervasyon Talebi — ${data.cabanaName}`,
    html: layout(
      "Yeni Rezervasyon Talebi",
      [
        heading("Yeni Rezervasyon Talebi"),
        paragraph("Yeni bir rezervasyon talebi oluşturuldu. Detaylar:"),
        infoTable(
          [
            infoRow("Misafir", data.guestName),
            infoRow("Cabana", data.cabanaName),
            infoRow("Giriş", formatDate(data.startDate)),
            infoRow("Çıkış", formatDate(data.endDate)),
            infoRow("Talep Eden", data.requestedBy),
          ].join(""),
        ),
        `<div style="margin-top:24px;">${paragraph("Lütfen talebi inceleyip onaylayın veya reddedin.")}</div>`,
      ].join(""),
    ),
  };
}

export function reminderTemplate(data: {
  guestName: string;
  cabanaName: string;
  startDate: Date | string;
}): TemplateResult {
  return {
    subject: `Hatırlatma: Yaklaşan Rezervasyon — ${data.cabanaName}`,
    html: layout(
      "Rezervasyon Hatırlatma",
      [
        heading("Rezervasyon Hatırlatması"),
        paragraph(
          `Merhaba <strong style="color:${BRAND.textPrimary}">${data.guestName}</strong>,`,
        ),
        paragraph("Yaklaşan rezervasyonunuzu hatırlatmak isteriz:"),
        infoTable(
          [
            infoRow("Cabana", data.cabanaName),
            infoRow("Giriş Tarihi", formatDate(data.startDate)),
          ].join(""),
        ),
        `<div style="text-align:center;margin-top:20px;">${badge("YAKLAŞAN", BRAND.gold)}</div>`,
        `<div style="margin-top:24px;">${paragraph("Sizi ağırlamak için sabırsızlanıyoruz!")}</div>`,
      ].join(""),
    ),
  };
}
