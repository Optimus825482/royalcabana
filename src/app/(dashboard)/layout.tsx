import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getLocale, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { authOptions } from "@/lib/auth";
import SessionProvider from "@/components/shared/SessionProvider";
import QueryProvider from "@/components/shared/QueryProvider";
import ToastProvider from "@/components/shared/ToastProvider";
import DashboardShell from "@/components/shared/DashboardShell";
import DashboardLayoutClient from "@/components/shared/DashboardLayoutClient";
import SessionTracker from "@/components/shared/SessionTracker";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionPromise = getServerSession(authOptions);
  const localePromise = getLocale();

  const session = await sessionPromise;

  if (!session) {
    redirect("/login");
  }

  const [locale, messages] = await Promise.all([localePromise, getMessages()]);

  return (
    <SessionProvider session={session}>
      <QueryProvider>
        <ToastProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <DashboardShell>
              <SessionTracker />
              <DashboardLayoutClient>{children}</DashboardLayoutClient>
            </DashboardShell>
          </NextIntlClientProvider>
        </ToastProvider>
      </QueryProvider>
    </SessionProvider>
  );
}
