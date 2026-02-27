"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  Plus,
  Trash2,
  Save,
  ToggleLeft,
  ToggleRight,
  Clock,
  Percent,
} from "lucide-react";
import { Field, ErrorMsg, inputCls } from "@/components/shared/FormComponents";

interface CancellationRule {
  id: string;
  hoursBeforeStart: number;
  penaltyPercent: number;
  label: string;
}

interface CancellationPolicy {
  enabled: boolean;
  rules: CancellationRule[];
  defaultPenaltyPercent: number;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

async function fetchPolicy(): Promise<CancellationPolicy> {
  const res = await fetch("/api/system/cancellation-policy");
  if (!res.ok) throw new Error("Politika yüklenemedi");
  return res.json();
}

async function updatePolicy(
  policy: CancellationPolicy,
): Promise<CancellationPolicy> {
  const res = await fetch("/api/system/cancellation-policy", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(policy),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Kayıt başarısız" }));
    throw new Error(err.message ?? "Kayıt başarısız");
  }
  return res.json();
}

function Skeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 bg-neutral-800 rounded-lg animate-pulse" />
      ))}
    </div>
  );
}

function RuleForm({
  onAdd,
  onCancel,
}: {
  onAdd: (rule: CancellationRule) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState("");
  const [hours, setHours] = useState("");
  const [penalty, setPenalty] = useState("");

  const handleSubmit = () => {
    const h = Number(hours);
    const p = Number(penalty);
    if (!label.trim() || isNaN(h) || h < 0 || isNaN(p) || p < 0 || p > 100)
      return;
    onAdd({
      id: generateId(),
      hoursBeforeStart: h,
      penaltyPercent: p,
      label: label.trim(),
    });
  };

  return (
    <div className="border border-dashed border-amber-600/40 rounded-lg p-4 space-y-3 bg-neutral-900/50">
      <p className="text-xs font-medium text-amber-400">Yeni Kural</p>
      <Field label="Etiket (ör: 48 saat öncesi - Ücretsiz)">
        <input
          className={inputCls}
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="48 saat öncesi - Ücretsiz"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Başlangıçtan kaç saat önce">
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="number"
              min={0}
              className={inputCls + " pl-10"}
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="48"
            />
          </div>
        </Field>
        <Field label="Ceza yüzdesi (%)">
          <div className="relative">
            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
            <input
              type="number"
              min={0}
              max={100}
              className={inputCls + " pl-10"}
              value={penalty}
              onChange={(e) => setPenalty(e.target.value)}
              placeholder="0"
            />
          </div>
        </Field>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSubmit}
          className="min-h-[44px] px-4 py-2 text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 text-neutral-950 transition-colors"
        >
          Ekle
        </button>
        <button
          onClick={onCancel}
          className="min-h-[44px] px-4 py-2 text-sm rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition-colors"
        >
          Vazgeç
        </button>
      </div>
    </div>
  );
}

export default function CancellationPolicyPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [localPolicy, setLocalPolicy] = useState<CancellationPolicy | null>(
    null,
  );
  const [successMsg, setSuccessMsg] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["cancellation-policy"],
    queryFn: fetchPolicy,
  });

  const mutation = useMutation({
    mutationFn: updatePolicy,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cancellation-policy"] });
      setLocalPolicy(null);
      setSuccessMsg("Politika başarıyla kaydedildi");
      setTimeout(() => setSuccessMsg(""), 3000);
    },
  });

  const policy = localPolicy ?? data;
  const isDirty = localPolicy !== null;

  const update = (patch: Partial<CancellationPolicy>) => {
    const base = localPolicy ?? data;
    if (!base) return;
    setLocalPolicy({ ...base, ...patch });
  };

  const addRule = (rule: CancellationRule) => {
    const base = localPolicy ?? data;
    if (!base) return;
    setLocalPolicy({ ...base, rules: [...base.rules, rule] });
    setShowForm(false);
  };

  const deleteRule = (id: string) => {
    const base = localPolicy ?? data;
    if (!base) return;
    setLocalPolicy({ ...base, rules: base.rules.filter((r) => r.id !== id) });
  };

  const sortedRules = policy?.rules
    ? [...policy.rules].sort((a, b) => b.hoursBeforeStart - a.hoursBeforeStart)
    : [];

  const handleSave = () => {
    if (!localPolicy) return;
    mutation.mutate(localPolicy);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-amber-400" />
          <div>
            <h1 className="text-xl font-semibold text-amber-400">
              İptal Politikası
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Rezervasyon iptal kurallarını ve ceza oranlarını yapılandır
            </p>
          </div>
        </div>

        {error && <ErrorMsg msg="Politika yüklenirken hata oluştu" />}
        {mutation.error && (
          <ErrorMsg
            msg={
              mutation.error instanceof Error
                ? mutation.error.message
                : "Kayıt başarısız"
            }
          />
        )}
        {successMsg && (
          <p className="text-emerald-400 text-xs bg-emerald-950/40 border border-emerald-800/40 rounded-lg px-3 py-2">
            {successMsg}
          </p>
        )}

        {isLoading ? (
          <Skeleton />
        ) : policy ? (
          <>
            {/* Toggle */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-neutral-200">
                  İptal Politikası
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {policy.enabled
                    ? "Aktif — kurallar uygulanıyor"
                    : "Pasif — iptal cezası yok"}
                </p>
              </div>
              <button
                onClick={() => update({ enabled: !policy.enabled })}
                className="flex items-center gap-2 text-sm transition-colors"
                aria-label={
                  policy.enabled
                    ? "Politikayı devre dışı bırak"
                    : "Politikayı etkinleştir"
                }
              >
                {policy.enabled ? (
                  <ToggleRight className="w-8 h-8 text-amber-400" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-neutral-600" />
                )}
              </button>
            </div>

            {/* Default Penalty */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
              <Field label="Varsayılan Ceza Yüzdesi (hiçbir kural uymuyorsa)">
                <div className="relative max-w-[200px]">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className={inputCls + " pl-10"}
                    value={policy.defaultPenaltyPercent}
                    onChange={(e) =>
                      update({
                        defaultPenaltyPercent: Math.min(
                          100,
                          Math.max(0, Number(e.target.value)),
                        ),
                      })
                    }
                  />
                </div>
              </Field>
            </div>

            {/* Rules */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-medium text-neutral-300">
                  Kurallar ({sortedRules.length})
                </h2>
                {!showForm && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 transition-colors min-h-[44px] px-3"
                  >
                    <Plus className="w-4 h-4" />
                    Kural Ekle
                  </button>
                )}
              </div>

              {showForm && (
                <RuleForm onAdd={addRule} onCancel={() => setShowForm(false)} />
              )}

              {sortedRules.length === 0 && !showForm && (
                <div className="text-center py-8 text-neutral-600 text-sm">
                  Henüz kural eklenmemiş
                </div>
              )}

              {sortedRules.map((rule) => (
                <div
                  key={rule.id}
                  className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-200 truncate">
                      {rule.label}
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="flex items-center gap-1 text-xs text-neutral-500">
                        <Clock className="w-3 h-3" />
                        {rule.hoursBeforeStart} saat önce
                      </span>
                      <span className="flex items-center gap-1 text-xs text-neutral-500">
                        <Percent className="w-3 h-3" />%{rule.penaltyPercent}{" "}
                        ceza
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteRule(rule.id)}
                    className="w-10 h-10 flex items-center justify-center text-neutral-600 hover:text-red-400 transition-colors rounded-lg hover:bg-neutral-800"
                    aria-label={`${rule.label} kuralını sil`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Preview */}
            {sortedRules.length > 0 && (
              <div className="bg-neutral-900/60 border border-neutral-800 rounded-lg p-4">
                <p className="text-xs font-medium text-amber-400/80 mb-2">
                  Önizleme
                </p>
                <div className="space-y-1">
                  {sortedRules.map((rule) => (
                    <p key={rule.id} className="text-xs text-neutral-400">
                      {rule.hoursBeforeStart} saat önce iptal →{" "}
                      {rule.penaltyPercent === 0 ? (
                        <span className="text-emerald-400">Ücretsiz iptal</span>
                      ) : (
                        <span className="text-amber-400">
                          %{rule.penaltyPercent} ceza
                        </span>
                      )}
                    </p>
                  ))}
                  <p className="text-xs text-neutral-500 pt-1 border-t border-neutral-800 mt-2">
                    Hiçbir kural uymuyorsa →{" "}
                    <span className="text-red-400">
                      %{policy.defaultPenaltyPercent} ceza
                    </span>
                  </p>
                </div>
              </div>
            )}

            {/* Save */}
            {isDirty && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSave}
                  disabled={mutation.isPending}
                  className="flex items-center gap-2 min-h-[44px] px-5 py-2 text-sm font-semibold rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {mutation.isPending ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
