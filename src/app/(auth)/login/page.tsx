"use client";

import { useEffect, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Role, MODULE_ACCESS } from "@/types";

type DemoAccount = {
  label: string;
  username: string;
  password: string;
};

const DEMO_ACCOUNTS: DemoAccount[] = [
  { label: "Sistem Yöneticisi", username: "sysadmin", password: "admin123" },
  { label: "Admin", username: "admin", password: "123456" },
  { label: "Casino Kullanıcısı", username: "casino1", password: "admin123" },
  { label: "F&B Kullanıcısı", username: "fnb1", password: "admin123" },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [demoQuickLoginEnabled, setDemoQuickLoginEnabled] = useState(true);

  async function performLogin(nextUsername: string, nextPassword: string) {
    setError("");

    if (!nextUsername.trim() || !nextPassword.trim()) {
      setError("Kullanıcı adı ve şifre zorunludur.");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        username: nextUsername,
        password: nextPassword,
        redirect: false,
      });

      if (result?.error) {
        setError("Kullanıcı adı veya şifre hatalı.");
        return;
      }

      const session = await getSession();
      const role = session?.user?.role as Role | undefined;

      // Collect device info & location, POST to login-track
      const trackData: { latitude?: number; longitude?: number } = {};
      try {
        if ("geolocation" in navigator && navigator.permissions) {
          const perm = await navigator.permissions.query({
            name: "geolocation",
          });
          if (perm.state !== "denied") {
            const pos = await new Promise<GeolocationPosition>(
              (resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                  timeout: 5000,
                  maximumAge: 300000,
                });
              },
            );
            trackData.latitude = pos.coords.latitude;
            trackData.longitude = pos.coords.longitude;
          }
        }
      } catch {
        // User denied or geolocation unavailable — continue without
      }

      fetch("/api/auth/login-track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(trackData),
      }).catch(() => {});

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await performLogin(username, password);
  }

  async function handleDemoLogin(account: DemoAccount) {
    if (!demoQuickLoginEnabled) return;
    setUsername(account.username);
    setPassword(account.password);
    await performLogin(account.username, account.password);
  }

  useEffect(() => {
    let mounted = true;

    async function loadPublicConfig() {
      try {
        const res = await fetch("/api/system/public-config", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const payload = await res.json();
        if (!mounted) return;
        if (payload?.success && payload?.data) {
          setDemoQuickLoginEnabled(
            payload.data.demoQuickLoginEnabled !== false,
          );
        }
      } catch {
        if (!mounted) return;
        setDemoQuickLoginEnabled(true);
      }
    }

    loadPublicConfig();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-neutral-950 px-4 py-8">
      <div className="w-full max-w-md px-6 py-8 sm:px-8 sm:py-10 bg-neutral-900 border border-yellow-700/30 rounded-2xl shadow-2xl">
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
              className="w-full bg-neutral-800 border border-neutral-700 focus:border-yellow-600 text-neutral-100 rounded-lg px-4 py-3 text-base sm:text-sm outline-none transition-colors placeholder:text-neutral-600 disabled:opacity-50"
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
              className="w-full bg-neutral-800 border border-neutral-700 focus:border-yellow-600 text-neutral-100 rounded-lg px-4 py-3 text-base sm:text-sm outline-none transition-colors placeholder:text-neutral-600 disabled:opacity-50"
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
            className="w-full min-h-[44px] bg-yellow-600 hover:bg-yellow-500 disabled:bg-yellow-800 disabled:cursor-not-allowed text-neutral-950 font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        {demoQuickLoginEnabled && (
          <div className="mt-6 border-t border-neutral-800 pt-5">
            <p className="text-xs text-neutral-400 mb-3">Demo hesaplar (tek tık giriş):</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.username}
                  type="button"
                  onClick={() => handleDemoLogin(account)}
                  disabled={loading}
                  className="text-left rounded-lg border border-neutral-700 bg-neutral-800/70 hover:bg-neutral-800 px-3 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <p className="text-xs text-yellow-400 font-medium">{account.label}</p>
                  <p className="text-xs text-neutral-300 mt-0.5">{account.username}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
