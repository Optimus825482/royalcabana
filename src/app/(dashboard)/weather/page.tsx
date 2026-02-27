"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Droplets,
  Wind,
  Gauge,
  Eye,
  Cloud,
  Sunrise,
  Sunset,
  CloudRain,
  CloudLightning,
  CloudSnow,
  CloudFog,
  Sun,
  CloudSun,
  Satellite,
} from "lucide-react";

// ── Types ──

interface CurrentWeather {
  temp: number;
  feelsLike: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  windDeg: number;
  pressure: number;
  uvi: number;
  clouds: number;
  visibility: number;
  sunrise: number;
  sunset: number;
  dt: number;
}

interface HourlyForecast {
  dt: number;
  temp: number;
  feelsLike: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  windDeg: number;
  pressure: number;
  uvi: number;
  clouds: number;
  visibility: number;
  pop: number;
  rain?: number;
  snow?: number;
}

interface DailyTemp {
  day: number;
  min: number;
  max: number;
  night: number;
  eve: number;
  morn: number;
}

interface DailyFeelsLike {
  day: number;
  night: number;
  eve: number;
  morn: number;
}

interface DailyForecast {
  dt: number;
  sunrise: number;
  sunset: number;
  moonPhase: number;
  temp: DailyTemp;
  feelsLike: DailyFeelsLike;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  windDeg: number;
  pressure: number;
  uvi: number;
  clouds: number;
  pop: number;
  rain?: number;
  snow?: number;
}

interface ForecastData {
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  city: string;
  lat: number;
  lon: number;
  mock: boolean;
}

type TabKey = "hourly" | "daily" | "satellite";

// ── Constants ──

const WIND_DIRECTIONS = ["K", "KD", "D", "GD", "G", "GB", "B", "KB"] as const;

const TURKISH_DAYS = [
  "Pazar",
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
] as const;

const MOON_PHASES = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"] as const;

const TABS: { key: TabKey; label: string }[] = [
  { key: "hourly", label: "Saatlik" },
  { key: "daily", label: "Günlük" },
  { key: "satellite", label: "Uydu / Radar" },
];

// ── Helpers ──

function getWindDirection(deg: number): string {
  const index = Math.round(deg / 45) % 8;
  return WIND_DIRECTIONS[index];
}

function getTurkishDay(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return TURKISH_DAYS[date.getDay()];
}

function getMoonEmoji(phase: number): string {
  // 0=new, 0.25=first quarter, 0.5=full, 0.75=last quarter
  const index = Math.round(phase * 8) % 8;
  return MOON_PHASES[index];
}

function formatTime(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
  });
}

function getUvColor(uvi: number): string {
  if (uvi <= 2) return "text-emerald-400";
  if (uvi <= 5) return "text-yellow-400";
  if (uvi <= 7) return "text-orange-400";
  if (uvi <= 10) return "text-red-400";
  return "text-fuchsia-400";
}

function getUvLabel(uvi: number): string {
  if (uvi <= 2) return "Düşük";
  if (uvi <= 5) return "Orta";
  if (uvi <= 7) return "Yüksek";
  if (uvi <= 10) return "Çok Yüksek";
  return "Aşırı";
}

// ── Weather Icon Component ──

function WeatherIcon({
  icon,
  size = "w-8 h-8",
}: {
  icon: string;
  size?: string;
}) {
  const code = icon.replace(/[dn]$/, "");

  switch (code) {
    case "01":
      return <Sun className={`${size} text-yellow-400`} />;
    case "02":
      return <CloudSun className={`${size} text-amber-400`} />;
    case "03":
    case "04":
      return <Cloud className={`${size} text-neutral-400`} />;
    case "09":
    case "10":
      return <CloudRain className={`${size} text-blue-400`} />;
    case "11":
      return <CloudLightning className={`${size} text-purple-400`} />;
    case "13":
      return <CloudSnow className={`${size} text-cyan-400`} />;
    case "50":
      return <CloudFog className={`${size} text-neutral-400`} />;
    default:
      return <Cloud className={`${size} text-neutral-500`} />;
  }
}

// ── Current Conditions Card ──

function CurrentConditions({ current }: { current: CurrentWeather }) {
  const details = [
    {
      label: "Nem",
      value: `%${current.humidity}`,
      Icon: Droplets,
      color: "text-blue-400",
    },
    {
      label: "Rüzgar",
      value: `${current.windSpeed} km/s ${getWindDirection(current.windDeg)}`,
      Icon: Wind,
      color: "text-teal-400",
    },
    {
      label: "Basınç",
      value: `${current.pressure} hPa`,
      Icon: Gauge,
      color: "text-orange-400",
    },
    {
      label: "UV İndeks",
      value: `${current.uvi} (${getUvLabel(current.uvi)})`,
      Icon: Sun,
      color: getUvColor(current.uvi),
    },
    {
      label: "Görüş",
      value: `${(current.visibility / 1000).toFixed(1)} km`,
      Icon: Eye,
      color: "text-neutral-300",
    },
    {
      label: "Bulut",
      value: `%${current.clouds}`,
      Icon: Cloud,
      color: "text-neutral-400",
    },
    {
      label: "Gün Doğumu",
      value: formatTime(current.sunrise),
      Icon: Sunrise,
      color: "text-amber-400",
    },
    {
      label: "Gün Batımı",
      value: formatTime(current.sunset),
      Icon: Sunset,
      color: "text-orange-400",
    },
  ];

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        {/* Main temp */}
        <div className="flex-1 p-6 flex items-center gap-5">
          <WeatherIcon icon={current.icon} size="w-16 h-16" />
          <div>
            <p className="text-5xl font-bold text-neutral-50 tracking-tight">
              {Math.round(current.temp)}°
            </p>
            <p className="text-sm text-neutral-400 mt-1">
              Hissedilen{" "}
              <span className="text-neutral-300">
                {Math.round(current.feelsLike)}°
              </span>
            </p>
            <p className="text-sm text-neutral-300 mt-0.5 capitalize">
              {current.description}
            </p>
          </div>
        </div>

        {/* Detail grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-neutral-800 sm:border-l border-t sm:border-t-0 border-neutral-800">
          {details.map((d) => (
            <div
              key={d.label}
              className="bg-neutral-900 px-4 py-3 flex flex-col gap-1"
            >
              <div className="flex items-center gap-1.5">
                <d.Icon className={`w-3.5 h-3.5 ${d.color}`} />
                <span className="text-[11px] text-neutral-500 uppercase tracking-wider">
                  {d.label}
                </span>
              </div>
              <span className="text-sm font-medium text-neutral-200">
                {d.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Hourly Forecast ──

function HourlyForecastView({ hourly }: { hourly: HourlyForecast[] }) {
  return (
    <div className="overflow-x-auto pb-2 -mx-1 px-1">
      <div className="flex gap-2" style={{ minWidth: "max-content" }}>
        {hourly.map((h, i) => {
          const isNow = i === 0;
          return (
            <div
              key={h.dt}
              className={`flex flex-col items-center gap-2 px-4 py-4 rounded-lg border transition-colors shrink-0 w-[100px] ${
                isNow
                  ? "bg-amber-500/10 border-amber-500/30"
                  : "bg-neutral-900 border-neutral-800 hover:border-neutral-700"
              }`}
            >
              <span
                className={`text-xs font-medium ${isNow ? "text-amber-400" : "text-neutral-400"}`}
              >
                {isNow ? "Şimdi" : formatTime(h.dt)}
              </span>
              <WeatherIcon icon={h.icon} size="w-7 h-7" />
              <span className="text-base font-semibold text-neutral-100">
                {Math.round(h.temp)}°
              </span>
              <span className="text-[11px] text-neutral-500">
                His. {Math.round(h.feelsLike)}°
              </span>

              {/* Pop */}
              {h.pop > 0 && (
                <div className="flex items-center gap-1">
                  <Droplets className="w-3 h-3 text-blue-400" />
                  <span className="text-[11px] text-blue-400">
                    %{Math.round(h.pop * 100)}
                  </span>
                </div>
              )}

              {/* Wind */}
              <div className="flex items-center gap-1">
                <Wind className="w-3 h-3 text-teal-400/60" />
                <span className="text-[11px] text-neutral-500">
                  {Math.round(h.windSpeed)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Daily Forecast ──

function DailyForecastView({ daily }: { daily: DailyForecast[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {daily.map((d, i) => {
        const isToday = i === 0;
        const dayName = isToday ? "Bugün" : getTurkishDay(d.dt);

        return (
          <div
            key={d.dt}
            className={`bg-neutral-900 border rounded-lg p-4 transition-colors ${
              isToday
                ? "border-amber-500/30"
                : "border-neutral-800 hover:border-neutral-700"
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p
                  className={`text-sm font-semibold ${isToday ? "text-amber-400" : "text-neutral-200"}`}
                >
                  {dayName}
                </p>
                <p className="text-[11px] text-neutral-500">
                  {formatDate(d.dt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg" title={`Ay fazı: ${d.moonPhase}`}>
                  {getMoonEmoji(d.moonPhase)}
                </span>
                <WeatherIcon icon={d.icon} size="w-8 h-8" />
              </div>
            </div>

            {/* Temp range */}
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-bold text-neutral-100">
                {Math.round(d.temp.max)}°
              </span>
              <span className="text-lg text-neutral-500">
                {Math.round(d.temp.min)}°
              </span>
            </div>

            <p className="text-xs text-neutral-400 capitalize mb-3">
              {d.description}
            </p>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div className="flex items-center gap-1.5">
                <Droplets className="w-3 h-3 text-blue-400" />
                <span className="text-neutral-500">Nem</span>
                <span className="text-neutral-300 ml-auto">%{d.humidity}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Wind className="w-3 h-3 text-teal-400" />
                <span className="text-neutral-500">Rüzgar</span>
                <span className="text-neutral-300 ml-auto">
                  {Math.round(d.windSpeed)} {getWindDirection(d.windDeg)}
                </span>
              </div>
              {d.pop > 0 && (
                <div className="flex items-center gap-1.5">
                  <CloudRain className="w-3 h-3 text-blue-400" />
                  <span className="text-neutral-500">Yağış</span>
                  <span className="text-neutral-300 ml-auto">
                    %{Math.round(d.pop * 100)}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Sun className={`w-3 h-3 ${getUvColor(d.uvi)}`} />
                <span className="text-neutral-500">UV</span>
                <span className={`ml-auto font-medium ${getUvColor(d.uvi)}`}>
                  {d.uvi}
                </span>
              </div>
            </div>

            {/* Sunrise / Sunset */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-neutral-800 text-xs">
              <div className="flex items-center gap-1.5">
                <Sunrise className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-neutral-400">
                  {formatTime(d.sunrise)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sunset className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-neutral-400">{formatTime(d.sunset)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Satellite / Radar View (Windy.com Embed) ──

type WindyLayer = "satellite" | "radar" | "wind" | "clouds" | "rain" | "temp";

const WINDY_LAYERS: {
  key: WindyLayer;
  label: string;
  icon: typeof Satellite;
}[] = [
  { key: "satellite", label: "Uydu", icon: Satellite },
  { key: "radar", label: "Radar", icon: CloudRain },
  { key: "wind", label: "Rüzgar", icon: Wind },
  { key: "clouds", label: "Bulut", icon: Cloud },
  { key: "rain", label: "Yağış", icon: CloudRain },
  { key: "temp", label: "Sıcaklık", icon: Sun },
];

// Merit Royal, Alsancak, Kıbrıs
const WINDY_LAT = 35.3557;
const WINDY_LON = 33.2104;
const WINDY_ZOOM = 7;

function buildWindyUrl(layer: WindyLayer): string {
  return `https://embed.windy.com/embed.html?type=map&location=coordinates&metricTemp=%C2%B0C&metricWind=km%2Fh&metricRain=mm&zoom=${WINDY_ZOOM}&overlay=${layer}&product=ecmwf&level=surface&lat=${WINDY_LAT}&lon=${WINDY_LON}&message=true`;
}

function SatelliteView() {
  const [layer, setLayer] = useState<WindyLayer>("satellite");

  return (
    <div className="space-y-3">
      {/* Layer toggle */}
      <div className="flex flex-wrap items-center gap-1.5">
        {WINDY_LAYERS.map((l) => {
          const isActive = layer === l.key;
          const Icon = l.icon;
          return (
            <button
              key={l.key}
              onClick={() => setLayer(l.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                isActive
                  ? "bg-neutral-700 text-neutral-100 border border-neutral-600"
                  : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 border border-transparent"
              }`}
            >
              <Icon className="w-3 h-3 inline-block mr-1.5 -mt-0.5" />
              {l.label}
            </button>
          );
        })}
      </div>

      {/* Windy.com iframe */}
      <iframe
        key={layer}
        src={buildWindyUrl(layer)}
        className="w-full rounded-xl border border-neutral-800"
        style={{ height: "clamp(350px, 50vh, 500px)" }}
        allowFullScreen
        title={`Hava Durumu — ${WINDY_LAYERS.find((l) => l.key === layer)?.label ?? layer}`}
      />

      {/* Attribution */}
      <p className="text-[11px] text-neutral-600 text-center">
        Veriler{" "}
        <a
          href="https://www.windy.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-500 hover:text-neutral-400 underline underline-offset-2"
        >
          Windy.com
        </a>{" "}
        tarafından sağlanmaktadır (ECMWF modeli)
      </p>
    </div>
  );
}

// ── Loading Skeleton ──

function ForecastSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      {/* Current conditions skeleton */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg h-48" />

      {/* Tabs skeleton */}
      <div className="flex gap-2">
        <div className="h-9 w-24 rounded-lg bg-neutral-800" />
        <div className="h-9 w-24 rounded-lg bg-neutral-800" />
        <div className="h-9 w-28 rounded-lg bg-neutral-800" />
      </div>

      {/* Cards skeleton */}
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="w-[100px] h-44 rounded-lg bg-neutral-900 border border-neutral-800 shrink-0"
          />
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──

export default function WeatherPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>("hourly");

  const { data, isLoading, isError, error, refetch, isFetching } =
    useQuery<ForecastData>({
      queryKey: ["weather-forecast"],
      queryFn: async () => {
        const res = await fetch("/api/weather/forecast");
        if (!res.ok) throw new Error("Hava durumu verileri alınamadı");
        return res.json();
      },
      staleTime: 30 * 60 * 1000, // 30 min
    });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const lastUpdated = useMemo(() => {
    if (!data?.current.dt) return null;
    return formatTime(data.current.dt);
  }, [data?.current.dt]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-4 sm:p-6">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.back()}
              className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800 transition-colors"
              aria-label="Geri dön"
            >
              <ArrowLeft className="w-4 h-4 text-neutral-400" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-semibold text-yellow-400 truncate">
                  Hava Durumu{data ? ` — ${data.city}` : ""}
                </h1>
                {data?.mock && (
                  <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/25">
                    demo
                  </span>
                )}
              </div>
              {lastUpdated && (
                <p className="text-xs text-neutral-500 mt-0.5">
                  Son güncelleme: {lastUpdated}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isFetching}
            className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800 transition-colors disabled:opacity-50"
            aria-label="Yenile"
          >
            <RefreshCw
              className={`w-4 h-4 text-neutral-400 ${isFetching ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* Loading */}
        {isLoading && <ForecastSkeleton />}

        {/* Error */}
        {isError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-center">
            <p className="text-sm text-red-400">
              {error instanceof Error
                ? error.message
                : "Hava durumu verileri yüklenemedi."}
            </p>
            <button
              onClick={handleRefresh}
              className="mt-3 px-4 py-2 text-xs font-medium rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 transition-colors"
            >
              Tekrar Dene
            </button>
          </div>
        )}

        {/* Content */}
        {data && (
          <>
            {/* Current Conditions */}
            <CurrentConditions current={data.current} />

            {/* Tab Switcher */}
            <div className="flex items-center gap-2">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 border border-transparent"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Forecast Views */}
            {activeTab === "hourly" && (
              <HourlyForecastView hourly={data.hourly} />
            )}
            {activeTab === "daily" && <DailyForecastView daily={data.daily} />}
            {activeTab === "satellite" && <SatelliteView />}
          </>
        )}
      </div>
    </div>
  );
}
