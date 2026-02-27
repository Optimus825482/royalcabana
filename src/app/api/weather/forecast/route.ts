import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api-middleware";
import { Role } from "@/types";

// --- Types ---

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
  rain: number | null;
  snow: number | null;
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
  rain: number | null;
  snow: number | null;
}

interface SatelliteData {
  infraredTimestamps: number[];
  radarTimestamps: number[];
  tileUrlTemplate: string;
}

interface ForecastData {
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  city: string;
  lat: number;
  lon: number;
  mock: boolean;
  satellite?: SatelliteData;
}

interface ForecastCache {
  data: ForecastData;
  expiresAt: number;
}

// --- Constants ---

const LAT = 35.3557;
const LON = 33.2104;
const CITY = "Alsancak, Kıbrıs";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Known new moon date for moon phase calculation
const KNOWN_NEW_MOON = new Date("2024-01-11T00:00:00Z").getTime();
const SYNODIC_MONTH = 29.53;

const OPEN_METEO_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
  `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,cloud_cover,uv_index` +
  `&hourly=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,cloud_cover,uv_index,precipitation_probability,precipitation,visibility` +
  `&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,wind_direction_10m_dominant` +
  `&timezone=Europe/Istanbul&forecast_days=7`;

const RAINVIEWER_URL = "https://api.rainviewer.com/public/weather-maps.json";
const TILE_URL_TEMPLATE =
  "https://tilecache.rainviewer.com/v2/satellite/{timestamp}/256/{z}/{x}/{y}/1/0_0.png";
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

// --- Helpers ---

function isoToUnix(iso: string): number {
  return Math.floor(new Date(iso).getTime() / 1000);
}

function isHourDaytime(isoTime: string): boolean {
  const h = new Date(isoTime).getHours();
  return h >= 6 && h < 18;
}

function getMoonPhase(date: Date): number {
  const daysSince = (date.getTime() - KNOWN_NEW_MOON) / (1000 * 60 * 60 * 24);
  return +(
    (((daysSince % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH) /
    SYNODIC_MONTH
  ).toFixed(2);
}

function isDaytime(): boolean {
  const hour = new Date().toLocaleString("en-US", {
    timeZone: "Europe/Istanbul",
    hour: "numeric",
    hour12: false,
  });
  return parseInt(hour, 10) >= 6 && parseInt(hour, 10) < 18;
}
// --- Open-Meteo Response Mappers ---

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapCurrent(json: any): CurrentWeather {
  const c = json.current;
  const now = Math.floor(Date.now() / 1000);
  const isDay = isDaytime();

  // Get today's sunrise/sunset from daily if available
  const todaySunrise = json.daily?.sunrise?.[0]
    ? isoToUnix(json.daily.sunrise[0])
    : now - 21600;
  const todaySunset = json.daily?.sunset?.[0]
    ? isoToUnix(json.daily.sunset[0])
    : now + 21600;

  return {
    temp: Math.round(c.temperature_2m),
    feelsLike: Math.round(c.apparent_temperature),
    description: getWmoDescription(c.weather_code),
    icon: getWmoIcon(c.weather_code, isDay),
    humidity: Math.round(c.relative_humidity_2m),
    windSpeed: Math.round(c.wind_speed_10m),
    windDeg: Math.round(c.wind_direction_10m),
    pressure: Math.round(c.surface_pressure),
    uvi: c.uv_index ?? 0,
    clouds: c.cloud_cover ?? 0,
    visibility: 10000, // Open-Meteo current doesn't include visibility
    sunrise: todaySunrise,
    sunset: todaySunset,
    dt: now,
  };
}

function mapHourly(json: any): HourlyForecast[] {
  const h = json.hourly;
  const count = Math.min(48, h.time.length);
  const result: HourlyForecast[] = [];

  for (let i = 0; i < count; i++) {
    const isDay = isHourDaytime(h.time[i]);
    result.push({
      dt: isoToUnix(h.time[i]),
      temp: Math.round(h.temperature_2m[i]),
      feelsLike: Math.round(h.apparent_temperature[i]),
      description: getWmoDescription(h.weather_code[i]),
      icon: getWmoIcon(h.weather_code[i], isDay),
      humidity: Math.round(h.relative_humidity_2m[i]),
      windSpeed: Math.round(h.wind_speed_10m[i]),
      windDeg: Math.round(h.wind_direction_10m[i]),
      pressure: Math.round(h.surface_pressure[i]),
      uvi: h.uv_index[i] ?? 0,
      clouds: h.cloud_cover[i] ?? 0,
      visibility: h.visibility?.[i] ?? 10000,
      pop: (h.precipitation_probability[i] ?? 0) / 100, // convert % to 0-1
      rain: h.precipitation[i] > 0 ? h.precipitation[i] : null,
      snow: null, // Open-Meteo doesn't separate snow in hourly precipitation
    });
  }

  return result;
}

function mapDaily(json: any): DailyForecast[] {
  const d = json.daily;
  const count = d.time.length;
  const result: DailyForecast[] = [];

  for (let i = 0; i < count; i++) {
    const max = d.temperature_2m_max[i];
    const min = d.temperature_2m_min[i];
    const flMax = d.apparent_temperature_max[i];
    const flMin = d.apparent_temperature_min[i];
    const date = new Date(d.time[i]);

    result.push({
      dt: isoToUnix(d.time[i]),
      sunrise: isoToUnix(d.sunrise[i]),
      sunset: isoToUnix(d.sunset[i]),
      moonPhase: getMoonPhase(date),
      temp: {
        day: Math.round((max + min) / 2),
        min: Math.round(min),
        max: Math.round(max),
        night: Math.round(min + 1),
        eve: Math.round(max - 2),
        morn: Math.round(min + 2),
      },
      feelsLike: {
        day: Math.round((flMax + flMin) / 2),
        night: Math.round(flMin + 1),
        eve: Math.round(flMax - 2),
        morn: Math.round(flMin + 2),
      },
      description: getWmoDescription(d.weather_code[i]),
      icon: getWmoIcon(d.weather_code[i], true), // daily icons always "d"
      humidity: 0, // Open-Meteo daily doesn't include humidity
      windSpeed: Math.round(d.wind_speed_10m_max[i]),
      windDeg: Math.round(d.wind_direction_10m_dominant[i]),
      pressure: 0, // Open-Meteo daily doesn't include pressure
      uvi: d.uv_index_max[i] ?? 0,
      clouds: 0, // Open-Meteo daily doesn't include cloud cover
      pop: (d.precipitation_probability_max[i] ?? 0) / 100,
      rain: d.precipitation_sum[i] > 0 ? d.precipitation_sum[i] : null,
      snow: null,
    });
  }

  return result;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
// --- RainViewer Satellite ---

async function fetchSatelliteData(): Promise<SatelliteData | undefined> {
  try {
    const res = await fetch(RAINVIEWER_URL, { next: { revalidate: 0 } });
    if (!res.ok) return undefined;

    const json = await res.json();
    const infraredTimestamps: number[] = (json.satellite?.infrared ?? []).map(
      (entry: { time: number }) => entry.time,
    );
    const radarPast: number[] = (json.radar?.past ?? []).map(
      (entry: { time: number }) => entry.time,
    );
    const radarNowcast: number[] = (json.radar?.nowcast ?? []).map(
      (entry: { time: number }) => entry.time,
    );

    return {
      infraredTimestamps,
      radarTimestamps: [...radarPast, ...radarNowcast],
      tileUrlTemplate: TILE_URL_TEMPLATE,
    };
  } catch {
    return undefined;
  }
}

// --- Mock Data ---

function generateMockData(): ForecastData {
  const now = Math.floor(Date.now() / 1000);

  const current: CurrentWeather = {
    temp: 28,
    feelsLike: 30,
    description: "Açık",
    icon: "01d",
    humidity: 55,
    windSpeed: 12,
    windDeg: 180,
    pressure: 1013,
    uvi: 7.5,
    clouds: 10,
    visibility: 10000,
    sunrise: now - 21600,
    sunset: now + 21600,
    dt: now,
  };

  const hourly: HourlyForecast[] = Array.from({ length: 48 }, (_, i) => ({
    dt: now + i * 3600,
    temp: 24 + Math.round(Math.sin((i / 24) * Math.PI * 2) * 6),
    feelsLike: 25 + Math.round(Math.sin((i / 24) * Math.PI * 2) * 6),
    description: i % 8 < 5 ? "Açık" : "Parçalı bulutlu",
    icon: i % 24 < 12 ? "01d" : "02n",
    humidity: 50 + Math.round(Math.sin((i / 12) * Math.PI) * 15),
    windSpeed: 8 + Math.round(Math.random() * 10),
    windDeg: (180 + i * 7) % 360,
    pressure: 1012 + Math.round(Math.sin((i / 48) * Math.PI) * 4),
    uvi: i % 24 >= 6 && i % 24 <= 18 ? +(Math.random() * 10).toFixed(1) : 0,
    clouds: 10 + Math.round(Math.random() * 30),
    visibility: 10000,
    pop: +(Math.random() * 0.3).toFixed(2),
    rain: null,
    snow: null,
  }));

  const daily: DailyForecast[] = Array.from({ length: 7 }, (_, i) => ({
    dt: now + i * 86400,
    sunrise: now + i * 86400 - 21600,
    sunset: now + i * 86400 + 21600,
    moonPhase: +((i * 0.14) % 1).toFixed(2),
    temp: {
      day: 28 + Math.round(Math.random() * 4),
      min: 20 + Math.round(Math.random() * 3),
      max: 30 + Math.round(Math.random() * 5),
      night: 21 + Math.round(Math.random() * 3),
      eve: 26 + Math.round(Math.random() * 3),
      morn: 22 + Math.round(Math.random() * 3),
    },
    feelsLike: {
      day: 30 + Math.round(Math.random() * 4),
      night: 22 + Math.round(Math.random() * 3),
      eve: 28 + Math.round(Math.random() * 3),
      morn: 23 + Math.round(Math.random() * 3),
    },
    description:
      i % 3 === 0 ? "Açık" : i % 3 === 1 ? "Parçalı bulutlu" : "Az bulutlu",
    icon: i % 3 === 0 ? "01d" : i % 3 === 1 ? "02d" : "03d",
    humidity: 45 + Math.round(Math.random() * 20),
    windSpeed: 10 + Math.round(Math.random() * 15),
    windDeg: Math.round(Math.random() * 360),
    pressure: 1010 + Math.round(Math.random() * 8),
    uvi: +(5 + Math.random() * 6).toFixed(1),
    clouds: 10 + Math.round(Math.random() * 40),
    pop: +(Math.random() * 0.4).toFixed(2),
    rain: null,
    snow: null,
  }));

  return { current, hourly, daily, city: CITY, lat: LAT, lon: LON, mock: true };
}
// --- Cache ---

let forecastCache: ForecastCache | null = null;

// --- Route Handler ---

const allRoles = [
  Role.SYSTEM_ADMIN,
  Role.ADMIN,
  Role.CASINO_USER,
  Role.FNB_USER,
];

export const GET = withAuth(allRoles, async () => {
  // Check cache
  if (forecastCache && Date.now() < forecastCache.expiresAt) {
    return NextResponse.json(forecastCache.data);
  }

  try {
    // Fetch Open-Meteo and RainViewer in parallel
    const [meteoRes, satellite] = await Promise.all([
      fetch(OPEN_METEO_URL, { next: { revalidate: 0 } }),
      fetchSatelliteData(),
    ]);

    if (!meteoRes.ok) {
      return NextResponse.json(generateMockData());
    }

    const json = await meteoRes.json();

    const data: ForecastData = {
      current: mapCurrent(json),
      hourly: mapHourly(json),
      daily: mapDaily(json),
      city: CITY,
      lat: LAT,
      lon: LON,
      mock: false,
      satellite,
    };

    forecastCache = { data, expiresAt: Date.now() + CACHE_TTL };

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(generateMockData());
  }
});
