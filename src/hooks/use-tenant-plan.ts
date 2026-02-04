"use client";

import { api } from "~/trpc/react";

export function useTenantPlan() {
  const { data: settings, isLoading } = api.settings.getAll.useQuery();

  const plan = settings?.tenant?.plan ?? "FREE";

  return {
    plan,
    isPro: plan === "PRO",
    isFree: plan === "FREE",
    isEnterprise: plan === "ENTERPRISE",
    isLoading,
    tenant: settings?.tenant,
  };
}
