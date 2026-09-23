// GoogleAnalytics.tsx

import React from "react";
import Script from "next/script";

const GoogleAnalytics = () => {
  const measurementId = process.env.NEXT_PUBLIC_MEASUREMENT_ID;
  if (process.env.NODE_ENV !== "production" || !measurementId) return null;
  return (
    <>
      <Script
        strategy="lazyOnload"
        src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_MEASUREMENT_ID}`}
      />

      <Script id="google-analytics" strategy="lazyOnload">
        {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              const campaignParams = new URLSearchParams(window.location.search);
              const campaignSource = campaignParams.get('utm_source');
              const campaignMedium = campaignParams.get('utm_medium');
              const knownCampaign = campaignParams.get('utm_campaign') === 'daily-bitcoin';
              const campaign = knownCampaign && ['newsletter', 'tiktok', 'instagram', 'youtube', 'x'].includes(campaignSource) && ['email', 'social'].includes(campaignMedium)
                ? { campaign_source: campaignSource, campaign_medium: campaignMedium, campaign_name: 'daily-bitcoin' }
                : {};
              gtag('config', '${process.env.NEXT_PUBLIC_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
              page_location: window.location.origin + window.location.pathname,
              allow_google_signals: false,
              ...campaign,
              });
          `}
      </Script>
    </>
  );
};

export default GoogleAnalytics;
