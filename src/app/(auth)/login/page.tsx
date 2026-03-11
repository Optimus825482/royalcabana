"use client";

import { useEffect, useState } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Sun, Moon } from "lucide-react";
import { Role, MODULE_ACCESS } from "@/types";
import { useTheme } from "@/components/providers/ThemeProvider";

type DemoAccount = {
  label: string;
  username: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [demoQuickLoginEnabled, setDemoQuickLoginEnabled] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

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

      const target =
        role && MODULE_ACCESS[role]?.length > 0 ? MODULE_ACCESS[role][0] : "/";
      // Full page redirect so the first dashboard request definitely sends the session cookie (avoids middleware missing token after client-side nav)
      window.location.assign(target);
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
      }
    }

    async function loadDemoAccounts() {
      if (process.env.NODE_ENV !== "development") return;
      try {
        const res = await fetch("/api/auth/demo-accounts", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const payload = await res.json();
        if (!mounted) return;
        if (payload?.success && Array.isArray(payload.data)) {
          setDemoAccounts(payload.data);
          setDemoQuickLoginEnabled(true);
        }
      } catch {
        if (!mounted) return;
      }
    }

    loadPublicConfig();
    loadDemoAccounts();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[var(--rc-background)] px-4 py-8 relative">
      {/* Tema geçişi — sadece client (hydration uyumu) */}
      {mounted && (
        <button
          type="button"
          onClick={toggleTheme}
          className="absolute top-4 right-4 flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--rc-card)] border border-[var(--rc-border-subtle)] text-[var(--rc-text-secondary)] hover:text-[var(--rc-gold)] hover:bg-[var(--rc-card-hover)] transition-colors"
          aria-label={theme === "dark" ? "Açık tema" : "Koyu tema"}
          title={theme === "dark" ? "Açık tema" : "Koyu tema"}
        >
          {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      )}

      <div className="w-full max-w-md px-6 py-8 sm:px-8 sm:py-10 bg-[var(--rc-card)] border border-[var(--rc-border-subtle)] rounded-2xl shadow-2xl">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          {!logoError ? (
            <Image
              src="/logo.png"
              alt="Royal Cabana"
              width={140}
              height={140}
              className="object-contain mb-3 mix-blend-lighten login-logo-anim"
              onError={() => setLogoError(true)}
              priority
            />
          ) : (
            <span className="text-2xl font-bold tracking-widest text-[var(--rc-gold)] mb-3">
              ROYAL CABANA
            </span>
          )}
          <h1 className="text-[var(--rc-gold)] text-lg font-semibold tracking-wide login-text-1">
            Royal Cabana
          </h1>
          <p className="text-[var(--rc-gold)]/80 text-sm font-bold tracking-[0.25em] uppercase mt-1.5 login-text-2">
            F&amp;B Digital Systems
          </p>
          <div className="w-16 h-px bg-linear-to-r from-transparent via-[var(--rc-gold)]/60 to-transparent mt-3 login-text-3" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="username"
              className="block text-sm text-[var(--rc-text-secondary)] mb-1.5"
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
              className="w-full bg-[var(--rc-input-bg)] border border-[var(--rc-input-border)] focus:border-[var(--rc-gold)] text-[var(--rc-text-primary)] rounded-lg px-4 py-3 text-base sm:text-sm outline-none transition-colors placeholder-[var(--rc-placeholder)] disabled:opacity-50"
              placeholder="Kullanıcı adınızı girin"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm text-[var(--rc-text-secondary)] mb-1.5"
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
              className="w-full bg-[var(--rc-input-bg)] border border-[var(--rc-input-border)] focus:border-[var(--rc-gold)] text-[var(--rc-text-primary)] rounded-lg px-4 py-3 text-base sm:text-sm outline-none transition-colors placeholder-[var(--rc-placeholder)] disabled:opacity-50"
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
            className="w-full min-h-11 bg-[var(--rc-gold)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-[var(--rc-btn-primary-text)] font-semibold rounded-lg py-2.5 text-sm transition-colors"
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        {demoQuickLoginEnabled && demoAccounts.length > 0 && (
          <div className="mt-6 border-t border-[var(--rc-border-subtle)] pt-5">
            <p className="text-xs text-[var(--rc-text-muted)] mb-3">
              Demo hesaplar (tek tık giriş):
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.username}
                  type="button"
                  onClick={() => handleDemoLogin(account)}
                  disabled={loading}
                  className="text-left rounded-lg border border-[var(--rc-border-subtle)] bg-[var(--rc-card-hover)] hover:opacity-90 px-3 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <p className="text-xs text-[var(--rc-gold)] font-medium">
                    {account.label}
                  </p>
                  <p className="text-xs text-[var(--rc-text-secondary)] mt-0.5">
                    {account.username}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
