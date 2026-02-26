import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { getLocale, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { authOptions } from "@/lib/auth";
import SessionProvider from "@/components/shared/SessionProvider";
import QueryProvider from "@/components/shared/QueryProvider";
import ToastProvider from "@/components/shared/ToastProvider";
import Navbar from "@/components/shared/Navbar";
import DashboardShell from "@/components/shared/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <SessionProvider session={session}>
      <QueryProvider>
        <ToastProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <div className="flex flex-col min-h-screen bg-neutral-950">
              <DashboardShell>
                <Navbar />
                <main className="flex-1 overflow-auto">{children}</main>
              </DashboardShell>
            </div>
          </NextIntlClientProvider>
        </ToastProvider>
      </QueryProvider>
    </SessionProvider>
  );
}
