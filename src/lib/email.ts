import nodemailer, { type Transporter } from "nodemailer";
import {
  reservationApprovedTemplate,
  reservationRejectedTemplate,
  reservationCancelledTemplate,
  newRequestNotificationTemplate,
  reminderTemplate,
} from "./email-templates";

// ── Config ──────────────────────────────────────────────────────────

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM =
  process.env.SMTP_FROM || "Royal Cabana <noreply@royalcabana.com>";

function isConfigured(): boolean {
  return !!(SMTP_HOST && SMTP_USER && SMTP_PASS);
}

// ── Transporter (singleton) ─────────────────────────────────────────

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!isConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

// ── Core send (fire-and-forget) ─────────────────────────────────────

async function sendMail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const t = getTransporter();
  if (!t) return;

  try {
    await t.sendMail({ from: SMTP_FROM, to, subject, html });
  } catch (err) {
    console.error("[email] Failed to send:", {
      to,
      subject,
      error: err instanceof Error ? err.message : err,
    });
  }
}

// ── Public API ──────────────────────────────────────────────────────

export const emailService = {
  /** Generic send */
  send(to: string, subject: string, html: string): void {
    void sendMail(to, subject, html);
  },

  sendReservationApproved(
    to: string,
    data: {
      guestName: string;
      cabanaName: string;
      startDate: Date | string;
      endDate: Date | string;
    },
  ): void {
    const { subject, html } = reservationApprovedTemplate(data);
    void sendMail(to, subject, html);
  },

  sendReservationRejected(
    to: string,
    data: { guestName: string; cabanaName: string; reason: string },
  ): void {
    const { subject, html } = reservationRejectedTemplate(data);
    void sendMail(to, subject, html);
  },

  sendReservationCancelled(
    to: string,
    data: { guestName: string; cabanaName: string },
  ): void {
    const { subject, html } = reservationCancelledTemplate(data);
    void sendMail(to, subject, html);
  },

  sendNewRequestNotification(
    to: string,
    data: {
      guestName: string;
      cabanaName: string;
      startDate: Date | string;
      endDate: Date | string;
      requestedBy: string;
    },
  ): void {
    const { subject, html } = newRequestNotificationTemplate(data);
    void sendMail(to, subject, html);
  },

  sendReminder(
    to: string,
    data: { guestName: string; cabanaName: string; startDate: Date | string },
  ): void {
    const { subject, html } = reminderTemplate(data);
    void sendMail(to, subject, html);
  },
} as const;
