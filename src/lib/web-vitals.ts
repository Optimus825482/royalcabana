import type { Metric } from "web-vitals";

const METRICS_ENDPOINT = "/api/metrics";

function sendToAnalytics(metric: Metric) {
  const payload = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType,
    timestamp: Date.now(),
  };

  if (process.env.NODE_ENV === "production") {
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(METRICS_ENDPOINT, body);
    } else {
      fetch(METRICS_ENDPOINT, {
        method: "POST",
        body,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      }).catch(() => {});
    }
  } else {
    const color =
      metric.rating === "good"
        ? "green"
        : metric.rating === "needs-improvement"
          ? "orange"
          : "red";
    console.log(
      `%c[Web Vital] ${metric.name}: ${Math.round(metric.value)}ms (${metric.rating})`,
      `color: ${color}; font-weight: bold`,
    );
  }
}

export async function reportWebVitals() {
  const { onCLS, onINP, onLCP, onTTFB } = await import("web-vitals");

  onCLS(sendToAnalytics);
  onINP(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
}
