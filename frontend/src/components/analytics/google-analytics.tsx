"use client";

import Script from "next/script";

export function GoogleAnalytics({ measurementId }: { measurementId?: string }) {
  const gaId = measurementId || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-1F8MCDHW26";

  if (!gaId) return null;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
      />
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}

/**
 * Fires a custom GA4 conversion or engagement event.
 */
export function trackGaEvent(eventName: string, params?: Record<string, any>) {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", eventName, params);
  }
}

/**
 * Track inbound marketing lead submission in GA4.
 */
export function trackLeadConversion(data: {
  city?: string;
  industryCode?: string;
  source?: string;
}) {
  trackGaEvent("generate_lead", {
    event_category: "Engagement",
    event_label: data.industryCode || "GENERAL",
    city_name: data.city || "All India",
    lead_source: data.source || "Website Form",
    value: 1,
    currency: "INR",
  });
}

/**
 * Track City SEO landing page impressions in GA4.
 */
export function trackCityLandingView(cityName: string, stateName: string) {
  trackGaEvent("view_city_landing", {
    event_category: "SEO_City_Matrix",
    city_name: cityName,
    state_name: stateName,
  });
}
