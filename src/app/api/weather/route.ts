import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";

// --- Types ---

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

interface WeatherCache {
  data: WeatherData;
  expiresAt: number;
}

// --- Constants ---

const LAT = 35.3557;
const LON = 33.2104;
const CITY = "Alsancak, Kıbrıs";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const OPEN_METEO_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
  `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,cloud_cover` +
  `&timezone=Europe/Istanbul`;

// --- WMO Code Mappings ---

function getWmoDescription(code: number): string {
  const map: Record<number, string> = {
    0: "Açık",
    1: "Az bulutlu",
    2: "Parçalı bulutlu",
    3: "Kapalı",
    45: "Sisli",
    48: "Sisli",
    51: "Çisenti",
    53: "Çisenti",
    55: "Çisenti",
    56: "Dondurucu çisenti",
    57: "Dondurucu çisenti",
    61: "Yağmurlu",
    63: "Yağmurlu",
    65: "Yağmurlu",
    66: "Dondurucu yağmur",
    67: "Dondurucu yağmur",
    71: "Karlı",
    73: "Karlı",
    75: "Karlı",
    77: "Kar taneleri",
    80: "Sağanak yağışlı",
    81: "Sağanak yağışlı",
    82: "Sağanak yağışlı",
    85: "Kar sağanağı",
    86: "Kar sağanağı",
    95: "Gök gürültülü fırtına",
    96: "Dolu ile fırtına",
    99: "Dolu ile fırtına",
  };
  return map[code] ?? "Bilinmiyor";
}

function getWmoIcon(code: number, isDay: boolean): string {
  const suffix = isDay ? "d" : "n";
  const baseIcon: Record<number, string> = {
    0: "01",
    1: "02",
    2: "03",
    3: "04",
    45: "50",
    48: "50",
    51: "09",
    53: "09",
    55: "09",
    56: "09",
    57: "09",
    61: "10",
    63: "10",
    65: "10",
    66: "10",
    67: "10",
    71: "13",
    73: "13",
    75: "13",
    77: "13",
    80: "09",
    81: "09",
    82: "09",
    85: "13",
    86: "13",
    95: "11",
    96: "11",
    99: "11",
  };
  return (baseIcon[code] ?? "01") + suffix;
}
function isDaytime(): boolean {
  const hour = new Date().toLocaleString("en-US", {
    timeZone: "Europe/Istanbul",
    hour: "numeric",
    hour12: false,
  });
  const h = parseInt(hour, 10);
  return h >= 6 && h < 18;
}

// --- Cache ---

let weatherCache: WeatherCache | null = null;

// --- Fallback ---

const FALLBACK: WeatherData = {
  temp: 28,
  feelsLike: 30,
  description: "Açık",
  icon: "01d",
  humidity: 55,
  windSpeed: 12,
  city: CITY,
  mock: true,
};

// --- Route Handler ---

const allRoles = [
  Role.SYSTEM_ADMIN,
  Role.ADMIN,
  Role.CASINO_USER,
  Role.FNB_USER,
];

export const GET = withAuth(allRoles, async () => {
  // Check cache
  if (weatherCache && Date.now() < weatherCache.expiresAt) {
    return NextResponse.json(weatherCache.data);
  }

  try {
    const res = await fetch(OPEN_METEO_URL, { next: { revalidate: 0 } });

    if (!res.ok) {
      return NextResponse.json(FALLBACK);
    }

    const json = await res.json();
    const c = json.current;
    const isDay = isDaytime();

    const data: WeatherData = {
      temp: Math.round(c.temperature_2m),
      feelsLike: Math.round(c.apparent_temperature),
      description: getWmoDescription(c.weather_code),
      icon: getWmoIcon(c.weather_code, isDay),
      humidity: Math.round(c.relative_humidity_2m),
      windSpeed: Math.round(c.wind_speed_10m), // already km/h
      city: CITY,
      mock: false,
    };

    weatherCache = { data, expiresAt: Date.now() + CACHE_TTL };

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(FALLBACK);
  }
});
