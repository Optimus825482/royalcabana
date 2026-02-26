import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 max-w-md w-full text-center">
        <p className="text-6xl font-bold text-amber-400 mb-4">404</p>

        <h1 className="text-xl font-semibold text-neutral-100 mb-2">
          Sayfa Bulunamadı
        </h1>

        <p className="text-neutral-400 text-sm mb-6">
          Aradığınız sayfa mevcut değil veya taşınmış olabilir.
        </p>

        <Link
          href="/"
          className="inline-block bg-amber-400 hover:bg-amber-300 text-neutral-950 font-medium px-6 py-2 rounded-lg transition-colors"
        >
          Ana sayfaya dön
        </Link>
      </div>
    </div>
  );
}
