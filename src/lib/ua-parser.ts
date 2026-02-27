import { DeviceType } from "@prisma/client";

interface ParsedUA {
  browser: string;
  os: string;
  deviceType: DeviceType;
}

export function parseUserAgent(ua: string | null): ParsedUA {
  if (!ua) return { browser: "Unknown", os: "Unknown", deviceType: "UNKNOWN" };

  // Device type
  let deviceType: DeviceType = "DESKTOP";
  if (/tablet|ipad/i.test(ua)) deviceType = "TABLET";
  else if (/mobile|android|iphone|ipod/i.test(ua)) deviceType = "MOBILE";

  // Browser
  let browser = "Unknown";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\//i.test(ua) || /opera/i.test(ua)) browser = "Opera";
  else if (/chrome\//i.test(ua) && !/edg/i.test(ua)) browser = "Chrome";
  else if (/safari\//i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";
  else if (/firefox\//i.test(ua)) browser = "Firefox";

  // OS
  let os = "Unknown";
  if (/windows/i.test(ua)) os = "Windows";
  else if (/macintosh|mac os/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua) && !/android/i.test(ua)) os = "Linux";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";

  return { browser, os, deviceType };
}
