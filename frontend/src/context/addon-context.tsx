"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { tenantAppService, UpdateTenantIndustryConfigInput } from "@/services/tenant-app-services";
import { ALL_ADDONS, AddonManifest, NavGroup, isAddonActiveInConfig, getAddonById } from "@/addons/addon-registry";

interface AddonContextType {
  industryConfig: UpdateTenantIndustryConfigInput | null;
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
  const [loading, setLoading] = useState<boolean>(true);

  const loadConfig = useCallback(async () => {
    try {
      const data = await tenantAppService.getIndustryConfig();
      if (data) {
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
    } catch (err) {
      console.warn("Could not fetch tenant industry config, using defaults", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const isAddonActive = useCallback(
    (addonId: string): boolean => {
      const addon = getAddonById(addonId);
      if (!addon) return false;
      return isAddonActiveInConfig(addon, industryConfig);
    },
    [industryConfig]
  );

  const isFeatureActive = useCallback(
    (featureKey: keyof UpdateTenantIndustryConfigInput): boolean => {
      if (!industryConfig) return false;
      return !!industryConfig[featureKey];
    },
    [industryConfig]
  );

  const activeAddons = useMemo(() => {
    return ALL_ADDONS.filter((addon) => isAddonActiveInConfig(addon, industryConfig));
  }, [industryConfig]);

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
