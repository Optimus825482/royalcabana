"use client";

import { useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Role, MODULE_ACCESS } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Kullanıcı adı ve şifre zorunludur.");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Kullanıcı adı veya şifre hatalı.");
        return;
      }

      const session = await getSession();
      const role = session?.user?.role as Role | undefined;

      if (role && MODULE_ACCESS[role]?.length > 0) {
        router.push(MODULE_ACCESS[role][0]);
      } else {
        router.push("/");
      }
    } catch {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-md px-8 py-10 bg-neutral-900 border border-yellow-700/30 rounded-2xl shadow-2xl">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        {!logoError ? (
          <Image
            src="/logo.png"
            alt="Royal Cabana"
            width={120}
            height={120}
            className="object-contain mb-3"
            onError={() => setLogoError(true)}
            priority
          />
        ) : (
          <span className="text-2xl font-bold tracking-widest text-yellow-500 mb-3">
            ROYAL CABANA
          </span>
        )}
        <h1 className="text-yellow-400 text-lg font-semibold tracking-wide">
          Yönetim Paneli
        </h1>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="username"
            className="block text-sm text-neutral-400 mb-1.5"
          >
            Kullanıcı Adı
          </label>
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            className="w-full bg-neutral-800 border border-neutral-700 focus:border-yellow-600 text-neutral-100 rounded-lg px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-neutral-600 disabled:opacity-50"
            placeholder="Kullanıcı adınızı girin"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm text-neutral-400 mb-1.5"
          >
            Şifre
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="w-full bg-neutral-800 border border-neutral-700 focus:border-yellow-600 text-neutral-100 rounded-lg px-4 py-2.5 text-sm outline-none transition-colors placeholder:text-neutral-600 disabled:opacity-50"
            placeholder="Şifrenizi girin"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm bg-red-950/40 border border-red-800/40 rounded-lg px-4 py-2.5">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:bg-yellow-800 disabled:cursor-not-allowed text-neutral-950 font-semibold rounded-lg py-2.5 text-sm transition-colors"
        >
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>
      </form>
    </div>
  );
}
