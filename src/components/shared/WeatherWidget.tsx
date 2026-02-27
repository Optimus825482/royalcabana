"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Cloud,
  Droplets,
  Wind,
  RefreshCw,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  ChevronRight,
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

export default function WeatherWidget() {
  const { data, isLoading, refetch, isFetching } = useQuery<WeatherData>({
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
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800">
        <div className="w-4 h-4 rounded-full bg-neutral-700 animate-pulse" />
        <div className="w-12 h-3 rounded bg-neutral-700 animate-pulse" />
      </div>
    );
  }

  if (!data) return null;

  const WeatherIcon = getWeatherIcon(data.icon);

  return (
    <Link href="/weather" className="block">
      <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-amber-500/30 transition-colors">
        <WeatherIcon className="w-5 h-5 text-amber-400 shrink-0" />
        <div className="flex items-center gap-2 text-xs text-neutral-300">
          <span className="font-semibold text-sm text-neutral-100">
            {data.temp}°C
          </span>
          <span className="hidden sm:inline text-neutral-500">|</span>
          <span className="hidden sm:inline capitalize">
            {data.description}
          </span>
          <span className="hidden md:inline text-neutral-500">|</span>
          <span className="hidden md:inline flex items-center gap-1">
            <Droplets className="w-3 h-3" /> {data.humidity}%
          </span>
          <span className="hidden md:inline flex items-center gap-1">
            <Wind className="w-3 h-3" /> {data.windSpeed} km/h
          </span>
        </div>
        {data.mock && (
          <span className="text-[10px] text-neutral-600 hidden sm:inline">
            (demo)
          </span>
        )}
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            refetch();
          }}
          disabled={isFetching}
          className="ml-auto w-7 h-7 flex items-center justify-center rounded text-neutral-500 hover:text-neutral-300 transition-colors disabled:opacity-40"
          aria-label="Hava durumunu yenile"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
          />
        </button>
        <ChevronRight className="w-4 h-4 text-neutral-600 shrink-0" />
      </div>
    </Link>
  );
}
