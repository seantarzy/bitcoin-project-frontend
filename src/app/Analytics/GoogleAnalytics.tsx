"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { analyticsExcluded, track } from "@/services/analytics";
export default function GoogleAnalytics() {
  const pathname = usePathname();
  useEffect(() => {
    const id = process.env.NEXT_PUBLIC_MEASUREMENT_ID;
    if (process.env.NODE_ENV !== "production" || !id || !pathname) return;
    const choice = new URLSearchParams(location.search).get("analytics");
    try {
      if (choice === "off")
        localStorage.setItem("bitcoin-analytics-excluded", "true");
      if (choice === "on")
        localStorage.removeItem("bitcoin-analytics-excluded");
    } catch {
      /* Storage may be unavailable. */
    }
    const w = window as typeof window & {
      dataLayer?: unknown[];
      gtag?: (...args: unknown[]) => void;
      bitcoinAnalyticsReady?: boolean;
      bitcoinLastPage?: string;
      [key: `ga-disable-${string}`]: boolean;
    };
    w[`ga-disable-${id}`] = analyticsExcluded() || choice === "off";
    if (w[`ga-disable-${id}`]) {
      w.bitcoinLastPage = undefined;
      return;
    }
    w.dataLayer = w.dataLayer || [];
    w.gtag =
      w.gtag ||
      function (...args: unknown[]) {
        w.dataLayer!.push(arguments);
      };
    if (!w.bitcoinAnalyticsReady) {
      w.gtag("js", new Date());
      const query = new URLSearchParams(location.search);
      const source = query.get("utm_source") || "";
      const medium = query.get("utm_medium") || "";
      const campaign =
        query.get("utm_campaign") === "daily-bitcoin" &&
        [
          "newsletter",
          "tiktok",
          "instagram",
          "youtube",
          "x",
          "reddit",
        ].includes(source) &&
        ["email", "social"].includes(medium)
          ? {
              campaign_source: source,
              campaign_medium: medium,
              campaign_name: "daily-bitcoin",
            }
          : {};
      let referrer = "";
      try {
        const u = new URL(document.referrer);
        referrer = u.origin + u.pathname;
      } catch {
        /* Direct visit. */
      }
      w.gtag("config", id, {
        send_page_view: false,
        page_location: location.origin + pathname,
        page_referrer: referrer,
        allow_google_signals: false,
        ...campaign,
      });
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      document.head.appendChild(script);
      w.bitcoinAnalyticsReady = true;
    }
    if (w.bitcoinLastPage !== pathname) {
      w.gtag("set", {
        page_location: location.origin + pathname,
        page_path: pathname,
      });
      track("page_view");
      w.bitcoinLastPage = pathname;
    }
  }, [pathname]);
  return null;
}
