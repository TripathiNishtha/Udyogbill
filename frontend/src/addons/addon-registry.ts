import { LucideIcon } from "lucide-react";
import { UpdateTenantIndustryConfigInput } from "@/services/tenant-app-services";
import { pharmaAddonManifest } from "./pharma/manifest";
import { pharmaSfaAddonManifest } from "./pharma-sfa/manifest";
import { garmentsAddonManifest } from "./garments/manifest";
import { manufacturingAddonManifest } from "./manufacturing/manifest";
import { fmcgAddonManifest } from "./fmcg/manifest";
import { accountingAddonManifest } from "./accounting/manifest";
import { whatsappAddonManifest } from "./whatsapp/manifest";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  id: string;
  title: string;
  icon: LucideIcon;
  items: NavItem[];
}

export interface AddonManifest {
  id: "pharma" | "pharma-sfa" | "garments" | "manufacturing" | "fmcg" | "accounting" | "whatsapp" | string;
  name: string;
  titleHindi?: string;
  description: string;
  icon: LucideIcon;
  badgeText?: string;
  category: string;
  featureKeys: (keyof UpdateTenantIndustryConfigInput)[];
  sidebarNavGroup?: NavGroup;
  highlights: string[];
}

export const ALL_ADDONS: AddonManifest[] = [
  pharmaAddonManifest,
  pharmaSfaAddonManifest,
  whatsappAddonManifest,
  garmentsAddonManifest,
  manufacturingAddonManifest,
  fmcgAddonManifest,
  accountingAddonManifest,
];

export function getAddonById(id: string): AddonManifest | undefined {
  return ALL_ADDONS.find((a) => a.id === id);
}

/**
 * Checks whether an add-on is considered active based on TenantIndustryConfig.
 */
export function isAddonActiveInConfig(
  addon: AddonManifest,
  config: UpdateTenantIndustryConfigInput | null | undefined
): boolean {
  if (!config) return false;

  // Check in configurationJson for explicit toggles
  try {
    if (config.configurationJson) {
      const parsed = JSON.parse(config.configurationJson);
      if (typeof parsed[addon.id] === "boolean") {
        return parsed[addon.id];
      }
    }
  } catch {
    // Ignore JSON parsing issues
  }

  // Accounting is a core platform capability enabled by default for all subscribed tenants unless explicitly turned off
  if (addon.id === "accounting") {
    return true;
  }

  // If addon has specific boolean feature flags, check if any of them is enabled
  if (addon.featureKeys.length > 0) {
    return addon.featureKeys.some((k) => !!config[k]);
  }

  return false;
}
