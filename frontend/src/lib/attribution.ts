"use client";

export interface AttributionData {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  landingPage?: string;
  citySlug?: string;
  referrerUrl?: string;
  searchKeyword?: string;
  industryCode?: string;
  deviceType?: string;
}

const STORAGE_KEY = "udyog_growth_attribution";

/**
 * Detects device category
 */
function getDeviceType(): string {
  if (typeof window === "undefined") return "Desktop";
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return "Tablet";
  }
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
    return "Mobile";
  }
  return "Desktop";
}

/**
 * Maps pathname or keyword to one of the 7 official industry codes:
 * PHARMA, FMCG, ELECTRONICS, GARMENTS, HARDWARE, SERVICE_SECTOR, OTHER
 */
export function detectIndustryCode(pathname: string, businessType?: string): string {
  const p = (pathname + " " + (businessType || "")).toLowerCase();
  if (p.includes("pharma") || p.includes("chemist") || p.includes("medicine") || p.includes("drug")) {
    return "PHARMA";
  }
  if (p.includes("fmcg") || p.includes("grocery") || p.includes("supermarket") || p.includes("kirana")) {
    return "FMCG";
  }
  if (p.includes("electronic") || p.includes("mobile") || p.includes("computer") || p.includes("appliance")) {
    return "ELECTRONICS";
  }
  if (p.includes("garment") || p.includes("cloth") || p.includes("apparel") || p.includes("textile") || p.includes("footwear")) {
    return "GARMENTS";
  }
  if (p.includes("hardware") || p.includes("sanitary") || p.includes("building") || p.includes("paint") || p.includes("plywood")) {
    return "HARDWARE";
  }
  if (p.includes("service") || p.includes("repair") || p.includes("agency") || p.includes("freelance") || p.includes("consult")) {
    return "SERVICE_SECTOR";
  }
  return "OTHER";
}

/**
 * Initializes and records organic & UTM attribution on first landing.
 * Stores in sessionStorage so attribution persists throughout visitor's session.
 */
export function initAttribution(): AttributionData {
  if (typeof window === "undefined") return {};

  try {
    const existing = sessionStorage.getItem(STORAGE_KEY);
    if (existing) {
      return JSON.parse(existing);
    }

    const url = new URL(window.location.href);
    const params = url.searchParams;

    const utmSource = params.get("utm_source") || (document.referrer ? new URL(document.referrer, window.location.origin).hostname : "direct");
    const utmMedium = params.get("utm_medium") || (document.referrer ? "referral" : "organic");
    const utmCampaign = params.get("utm_campaign") || undefined;
    const searchKeyword = params.get("utm_term") || params.get("q") || params.get("keyword") || undefined;
    const landingPage = window.location.pathname;
    let citySlug: string | undefined;
    if (landingPage.startsWith("/city/")) {
      citySlug = landingPage.replace("/city/", "").split("/")[0]?.trim();
    }
    const referrerUrl = document.referrer || undefined;
    const deviceType = getDeviceType();
    const industryCode = detectIndustryCode(landingPage);

    const attribution: AttributionData = {
      utmSource,
      utmMedium,
      utmCampaign,
      landingPage,
      citySlug,
      referrerUrl,
      searchKeyword,
      industryCode,
      deviceType,
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
    return attribution;
  } catch {
    return {};
  }
}

/**
 * Retrieves attribution data to attach to lead submissions or trial signups.
 */
export function getAttributionData(): AttributionData {
  if (typeof window === "undefined") return {};
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return initAttribution();
  } catch {
    return {};
  }
}
