import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-950 gap-4 px-6 text-center">
      <h1 className="text-6xl font-bold text-yellow-500">404</h1>
      <h2 className="text-lg font-semibold text-neutral-200">
        Sayfa bulunamadı
      </h2>
      <p className="text-sm text-neutral-500 max-w-md">
        Aradığınız sayfa mevcut değil veya taşınmış olabilir.
      </p>
      <Link
        href="/login"
        className="px-5 py-2 text-sm font-medium rounded-lg bg-yellow-600 hover:bg-yellow-500 text-neutral-950 transition-colors"
      >
        Ana Sayfaya Dön
      </Link>
    </div>
  );
}
