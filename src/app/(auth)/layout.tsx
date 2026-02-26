export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-neutral-950 px-4 py-8">
      {children}
    </div>
  );
}
