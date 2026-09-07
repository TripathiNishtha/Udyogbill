"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { tenantAppService, UpdateTenantIndustryConfigInput } from "@/services/tenant-app-services";
import { ALL_ADDONS, AddonManifest, NavGroup, isAddonActiveInConfig, getAddonById } from "@/addons/addon-registry";

interface AddonContextType {
  industryConfig: UpdateTenantIndustryConfigInput | null;
  activePack: any | null;
  industryCode: string;
  loading: boolean;
  activeAddons: AddonManifest[];
  activeNavGroups: NavGroup[];
  isAddonActive: (addonId: string) => boolean;
  isFeatureActive: (featureKey: keyof UpdateTenantIndustryConfigInput) => boolean;
  toggleAddon: (addonId: string, enabled: boolean) => Promise<void>;
  refreshConfig: () => Promise<void>;
}

const AddonContext = createContext<AddonContextType | undefined>(undefined);

export function AddonProvider({ children }: { children: React.ReactNode }) {
  const [industryConfig, setIndustryConfig] = useState<UpdateTenantIndustryConfigInput | null>(null);
  const [activePack, setActivePack] = useState<any | null>(null);
  const [industryCode, setIndustryCode] = useState<string>("OTHER");
  const [enrolledAddonIds, setEnrolledAddonIds] = useState<string[]>([]);
  const [isSfaActiveFromQuota, setIsSfaActiveFromQuota] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const loadConfig = useCallback(async () => {
    try {
      const [configData, subData, packData, sfaQuotaData] = await Promise.allSettled([
        tenantAppService.getIndustryConfig(),
        tenantAppService.getSubscriptionStatus(),
        tenantAppService.getActiveIndustryPack(),
        tenantAppService.getPharmaSfaQuota(),
      ]);

      if (configData.status === "fulfilled" && configData.value) {
        const data = configData.value;
        setIndustryConfig({
          enableBatchTracking: !!data.enableBatchTracking,
          enableExpiryTracking: !!data.enableExpiryTracking,
          enableSerialTracking: !!data.enableSerialTracking,
          enableMultiUnitConversion: !!data.enableMultiUnitConversion,
          enableSizeColorMatrix: !!data.enableSizeColorMatrix,
          enableRecipeBOM: !!data.enableRecipeBOM,
          enableScheduleH1DrugTracking: !!data.enableScheduleH1DrugTracking,
          enableEWayBill: !!data.enableEWayBill,
          enableEInvoicing: !!data.enableEInvoicing,
          configurationJson: data.configurationJson || "{}",
        });
      }

      if (packData.status === "fulfilled" && packData.value) {
        setActivePack(packData.value);
        const resolvedCode = (packData.value.activeIndustryModule || packData.value.industryTypeCode || "OTHER").toUpperCase();
        setIndustryCode(resolvedCode);
      }

      if (sfaQuotaData.status === "fulfilled" && sfaQuotaData.value) {
        const quota = sfaQuotaData.value?.data ?? sfaQuotaData.value;
        if (quota?.isPharmaSfaActive || quota?.IsPharmaSfaActive) {
          setIsSfaActiveFromQuota(true);
        }
      }

      if (subData.status === "fulfilled" && subData.value?.addons) {
        const activeCodes = subData.value.addons
          .filter((a: any) => a.isEnrolled && (!a.enrolledExpiresAtUtc || new Date(a.enrolledExpiresAtUtc).getTime() > Date.now()))
          .map((a: any) => a.code.replace("ADDON_", "").toLowerCase().replace(/_/g, "-"));
        setEnrolledAddonIds(activeCodes);
      }
    } catch (err) {
      console.warn("Could not fetch tenant industry config or subscription, using defaults", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const isAddonActive = useCallback(
    (addonId: string): boolean => {
      const cleanId = addonId.toLowerCase().replace("addon_", "").replace(/_/g, "-");

      // 1. Pharma SFA is a specialized field force add-on
      // Visible in portal ONLY for tenants who have active SFA subscription or entitlement
      if (cleanId === "pharma-sfa") {
        if (isSfaActiveFromQuota) return true;
        if (activePack?.isPharmaSfaActive || activePack?.IsPharmaSfaActive) return true;
        if (
          enrolledAddonIds.includes("pharma-sfa") ||
          enrolledAddonIds.includes("pharma_sfa") ||
          enrolledAddonIds.includes("addon-pharma-sfa") ||
          enrolledAddonIds.includes("addon_pharma_sfa")
        ) return true;
        const addon = getAddonById("pharma-sfa");
        return addon ? isAddonActiveInConfig(addon, industryConfig) : false;
      }

      // 2. Industry-specific vertical suites (pharma, fmcg, garments, manufacturing)
      // Active ONLY if tenant's registered primary industry matches, or if explicitly enrolled / enabled
      const INDUSTRY_ADDON_IDS = ["pharma", "fmcg", "garments", "manufacturing"];
      if (INDUSTRY_ADDON_IDS.includes(cleanId)) {
        const tenantIndustry = (industryCode || "OTHER").trim().toUpperCase();
        const mappedTenantIndustry = tenantIndustry === "HARDWARE" ? "manufacturing" : tenantIndustry.toLowerCase();

        if (mappedTenantIndustry === cleanId) return true;
        if (enrolledAddonIds.includes(cleanId) || enrolledAddonIds.includes(cleanId.replace(/-/g, "_"))) return true;
        const addon = getAddonById(cleanId);
        return addon ? isAddonActiveInConfig(addon, industryConfig) : false;
      }

      // 3. Optional / paid Add-ons (e.g. accounting, whatsapp, etc.)
      // Active ONLY if enrolled via subscription or explicitly enabled in configurationJson
      if (enrolledAddonIds.includes(cleanId) || enrolledAddonIds.includes(cleanId.replace(/-/g, "_"))) {
        return true;
      }

      const addon = getAddonById(addonId);
      if (addon) {
        return isAddonActiveInConfig(addon, industryConfig);
      }

      return false;
    },
    [industryConfig, enrolledAddonIds, industryCode, activePack]
  );

  const isFeatureActive = useCallback(
    (featureKey: keyof UpdateTenantIndustryConfigInput): boolean => {
      if (!industryConfig) return false;
      return !!industryConfig[featureKey];
    },
    [industryConfig]
  );

  const activeAddons = useMemo(() => {
    return ALL_ADDONS.filter((addon) => isAddonActive(addon.id));
  }, [isAddonActive]);

  const activeNavGroups = useMemo(() => {
    return activeAddons
      .map((addon) => addon.sidebarNavGroup)
      .filter((nav): nav is NavGroup => Boolean(nav));
  }, [activeAddons]);

  const toggleAddon = useCallback(
    async (addonId: string, enabled: boolean) => {
      const addon = getAddonById(addonId);
      if (!addon) return;

      const currentConfig: UpdateTenantIndustryConfigInput = industryConfig || {
        enableBatchTracking: false,
        enableExpiryTracking: false,
        enableSerialTracking: false,
        enableMultiUnitConversion: false,
        enableSizeColorMatrix: false,
        enableRecipeBOM: false,
        enableScheduleH1DrugTracking: false,
        enableEWayBill: false,
        enableEInvoicing: false,
        configurationJson: "{}",
      };

      // 1. Update associated feature flags
      const updatedConfig: UpdateTenantIndustryConfigInput = { ...currentConfig };
      for (const key of addon.featureKeys) {
        (updatedConfig as any)[key] = enabled;
      }

      // 2. Update configurationJson override
      let configJsonObj: Record<string, any> = {};
      try {
        if (currentConfig.configurationJson) {
          configJsonObj = JSON.parse(currentConfig.configurationJson);
        }
      } catch {
        configJsonObj = {};
      }
      configJsonObj[addonId] = enabled;
      updatedConfig.configurationJson = JSON.stringify(configJsonObj);

      // Optimistic update
      setIndustryConfig(updatedConfig);

      try {
        await tenantAppService.updateIndustryConfig(updatedConfig);
      } catch (err) {
        console.error("Failed to save updated industry config", err);
        // Rollback on error
        await loadConfig();
        throw err;
      }
    },
    [industryConfig, loadConfig]
  );

  return (
    <AddonContext.Provider
      value={{
        industryConfig,
        activePack,
        industryCode,
        loading,
        activeAddons,
        activeNavGroups,
        isAddonActive,
        isFeatureActive,
        toggleAddon,
        refreshConfig: loadConfig,
      }}
    >
      {children}
    </AddonContext.Provider>
  );
}

export function useAddons() {
  const context = useContext(AddonContext);
  if (!context) {
    throw new Error("useAddons must be used within an AddonProvider");
  }
  return context;
}
