"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Cloud,
  Droplets,
  Wind,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Thermometer,
  Eye,
  ArrowRight,
} from "lucide-react";

interface WeatherData {
  temp: number;
  feelsLike: number;
  description: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  city: string;
  mock: boolean;
}

const ICON_MAP: Record<string, typeof Sun> = {
  "01": Sun,
  "02": Cloud,
  "03": Cloud,
  "04": Cloud,
  "09": CloudRain,
  "10": CloudRain,
  "11": CloudLightning,
  "13": CloudSnow,
  "50": CloudFog,
};

function getWeatherIcon(iconCode: string) {
  const prefix = iconCode.slice(0, 2);
  return ICON_MAP[prefix] || Cloud;
}

export default function WeatherCard() {
  const { data, isLoading } = useQuery<WeatherData>({
    queryKey: ["weather"],
    queryFn: async () => {
      const res = await fetch("/api/weather");
      if (!res.ok) throw new Error("Weather fetch failed");
      return res.json();
    },
    staleTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-neutral-800" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-20 rounded bg-neutral-800" />
            <div className="h-4 w-32 rounded bg-neutral-800" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const WeatherIcon = getWeatherIcon(data.icon);

  return (
    <div className="bg-gradient-to-br from-neutral-900 to-neutral-900/80 border border-neutral-800 rounded-xl p-5 hover:border-amber-500/30 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <WeatherIcon className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <p className="text-3xl font-semibold text-neutral-100">
              {data.temp}°C
            </p>
            <p className="text-sm text-neutral-400 capitalize">
              {data.description}
            </p>
          </div>
        </div>
        {data.mock && (
          <span className="text-[10px] text-neutral-600 bg-neutral-800 px-2 py-0.5 rounded">
            demo
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Thermometer className="w-4 h-4 text-orange-400" />
          <span className="text-neutral-400">Hissedilen</span>
          <span className="text-neutral-200 ml-auto">{data.feelsLike}°</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Droplets className="w-4 h-4 text-blue-400" />
          <span className="text-neutral-400">Nem</span>
          <span className="text-neutral-200 ml-auto">{data.humidity}%</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Wind className="w-4 h-4 text-cyan-400" />
          <span className="text-neutral-400">Rüzgar</span>
          <span className="text-neutral-200 ml-auto">
            {data.windSpeed} km/h
          </span>
        </div>
      </div>

      <Link
        href="/weather"
        className="flex items-center justify-center gap-2 w-full py-2.5 text-sm font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors"
      >
        <Eye className="w-4 h-4" />
        Detaylı Tahmin
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
