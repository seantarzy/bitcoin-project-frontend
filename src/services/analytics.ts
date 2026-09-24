export type EventName =
  | "page_view"
  | "section_view"
  | "daily_teaser_view"
  | "daily_teaser_click"
  | "daily_view"
  | "daily_amount_changed"
  | "daily_archive_opened"
  | "newsletter_view"
  | "newsletter_start"
  | "newsletter_submit"
  | "newsletter_error"
  | "newsletter_signup"
  | "daily_vote"
  | "daily_share"
  | "daily_merchant_click"
  | "calculator_used"
  | "category_selected"
  | "comparison_opened"
  | "benchmark_updated"
  | "share_opened"
  | "share_link_copied"
  | "share_card_downloaded"
  | "native_share_completed"
  | "goal_saved";
export type EventParameters = {
  item_id?: string;
  category?: string;
  method?: string;
  section?: string;
  edition_date?: string;
  placement?: string;
  outcome?: string;
};
export function safeParameters(parameters: EventParameters) {
  const safe: Record<string, string> = {};
  for (const key of [
    "item_id",
    "category",
    "method",
    "section",
    "edition_date",
    "placement",
    "outcome",
  ] as const) {
    const value = parameters[key];
    if (typeof value === "string" && /^[a-zA-Z0-9 _&-]{1,64}$/.test(value))
      safe[key] = value;
  }
  return safe;
}
export function analyticsExcluded() {
  if (typeof window === "undefined") return true;
  if (
    !["whatsbitcoinsprice.com", "www.whatsbitcoinsprice.com"].includes(
      location.hostname,
    )
  )
    return true;
  if (location.pathname.startsWith("/newsletter")) return true;
  try {
    return localStorage.getItem("bitcoin-analytics-excluded") === "true";
  } catch {
    return false;
  }
}
export function track(event: EventName, parameters: EventParameters = {}) {
  if (
    process.env.NODE_ENV !== "production" ||
    !process.env.NEXT_PUBLIC_MEASUREMENT_ID ||
    analyticsExcluded()
  )
    return;
  const analytics = window as typeof window & {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  };
  analytics.dataLayer = analytics.dataLayer || [];
  const send =
    analytics.gtag ||
    function (...args: unknown[]) {
      analytics.dataLayer!.push(arguments);
    };
  send("event", event, {
    ...safeParameters(parameters),
    page_location: location.origin + location.pathname,
    page_path: location.pathname,
  });
}
