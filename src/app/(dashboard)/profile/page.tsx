"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  User,
  Mail,
  Lock,
  Shield,
  CalendarDays,
  Save,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface ProfileData {
  id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  SYSTEM_ADMIN: "Sistem Yöneticisi",
  ADMIN: "Yönetici",
  CASINO_USER: "Casino Kullanıcısı",
  FNB_USER: "F&B Kullanıcısı",
};

async function fetchProfile(): Promise<ProfileData> {
  const res = await fetch("/api/profile");
  if (!res.ok) throw new Error("Profil yüklenemedi");
  const json = await res.json();
  return json.data ?? json;
}

export default function ProfilePage() {
  useSession();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: fetchProfile,
  });

  // Form state
  const [usernameDraft, setUsernameDraft] = useState<string | null>(null);
  const [emailDraft, setEmailDraft] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Visibility toggles
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Feedback
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const username = usernameDraft ?? profile?.username ?? "";
  const email = emailDraft ?? profile?.email ?? "";

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Güncelleme başarısız.");
      }
      return data as ProfileData;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["profile"], data);
      setUsernameDraft(null);
      setEmailDraft(null);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setToast({ type: "success", message: "Profil başarıyla güncellendi." });
    },
    onError: (error) => {
      setToast({
        type: "error",
        message: error instanceof Error ? error.message : "Bir hata oluştu.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword && newPassword !== confirmPassword) {
      setToast({ type: "error", message: "Yeni şifreler eşleşmiyor." });
      return;
    }
    if (newPassword && newPassword.length < 8) {
      setToast({
        type: "error",
        message:
          "Yeni şifre en az 8 karakter olmalı, 1 büyük harf, 1 küçük harf ve 1 rakam içermelidir.",
      });
      return;
    }

    const hasChanges =
      username !== profile?.username ||
      email !== profile?.email ||
      newPassword.length > 0;

    if (!hasChanges) {
      setToast({ type: "error", message: "Değişiklik yapılmadı." });
      return;
    }

    const payload: Record<string, string> = {};
    if (username !== profile?.username) payload.username = username;
    if (email !== profile?.email) payload.email = email;
    if (newPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    updateMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  const memberSince = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("tr-TR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg text-sm shadow-lg transition-all ${
            toast.type === "success"
              ? "bg-emerald-900/90 text-emerald-200 border border-emerald-700"
              : "bg-red-900/90 text-red-200 border border-red-700"
          }`}
          role="alert"
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-full bg-amber-400/10 border border-amber-500/30 flex items-center justify-center">
          <User className="w-6 h-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-neutral-100">Profilim</h1>
          <p className="text-sm text-neutral-400">
            Hesap bilgilerinizi görüntüleyin ve düzenleyin
          </p>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-neutral-400 text-xs mb-1">
            <Shield className="w-3.5 h-3.5" />
            Rol
          </div>
          <p className="text-sm text-neutral-200">
            {ROLE_LABELS[profile?.role ?? ""] ?? profile?.role}
          </p>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-neutral-400 text-xs mb-1">
            <CalendarDays className="w-3.5 h-3.5" />
            Üyelik
          </div>
          <p className="text-sm text-neutral-200">{memberSince}</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Username */}
        <div>
          <label
            htmlFor="username"
            className="block text-sm text-neutral-300 mb-1.5"
          >
            Kullanıcı Adı
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsernameDraft(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-10 pr-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-colors"
              required
              minLength={3}
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm text-neutral-300 mb-1.5"
          >
            E-posta
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmailDraft(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-10 pr-4 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-colors"
              required
            />
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-neutral-800 pt-5">
          <p className="text-sm text-neutral-400 mb-4">
            Şifre değiştirmek istiyorsanız aşağıdaki alanları doldurun
          </p>
        </div>

        {/* Current Password */}
        <div>
          <label
            htmlFor="currentPassword"
            className="block text-sm text-neutral-300 mb-1.5"
          >
            Mevcut Şifre
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              id="currentPassword"
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-10 pr-10 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-colors"
              placeholder="Şifre değişikliği için gerekli"
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
              aria-label={showCurrent ? "Şifreyi gizle" : "Şifreyi göster"}
            >
              {showCurrent ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label
            htmlFor="newPassword"
            className="block text-sm text-neutral-300 mb-1.5"
          >
            Yeni Şifre
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              id="newPassword"
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-10 pr-10 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-colors"
              placeholder="En az 8 karakter, büyük/küçük harf ve rakam"
              minLength={8}
              pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$"
              title="En az 8 karakter, 1 büyük harf, 1 küçük harf ve 1 rakam"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
              aria-label={showNew ? "Şifreyi gizle" : "Şifreyi göster"}
            >
              {showNew ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm text-neutral-300 mb-1.5"
          >
            Yeni Şifre (Tekrar)
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              id="confirmPassword"
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-10 pr-10 py-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-colors"
              placeholder="Yeni şifreyi tekrar girin"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
              aria-label={showConfirm ? "Şifreyi gizle" : "Şifreyi göster"}
            >
              {showConfirm ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 font-medium rounded-lg py-3 text-sm transition-colors active:scale-[0.98]"
        >
          {updateMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {updateMutation.isPending
            ? "Kaydediliyor..."
            : "Değişiklikleri Kaydet"}
        </button>
      </form>
    </div>
  );
}
