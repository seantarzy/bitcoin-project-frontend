type EventName =
  | "daily_teaser_click"
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
export function track(
  event: EventName,
  parameters: { item_id?: string; category?: string; method?: string } = {},
) {
  if (
    process.env.NODE_ENV !== "production" ||
    !process.env.NEXT_PUBLIC_MEASUREMENT_ID
  )
    return;
  const analytics = window as typeof window & {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  };
  analytics.dataLayer = analytics.dataLayer || [];
  // Keep interactions that occur before the lazily loaded Google tag is ready.
  const send =
    analytics.gtag ||
    function (...args: unknown[]) {
      analytics.dataLayer!.push(arguments);
    };
  send("event", event, parameters);
}
