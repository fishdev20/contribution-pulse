"use client";

import { create } from "zustand";

type DashboardMetric = "commits" | "merges" | "prs" | "pipelines";
type ProviderFilter = "all" | "gitlab" | "azure" | "github";

type UIState = {
  profileMenuOpen: boolean;
  dashboardMetric: DashboardMetric;
  dashboardProvider: ProviderFilter;
  dashboardYear: number | null;
  setProfileMenuOpen: (open: boolean) => void;
  toggleProfileMenu: () => void;
  setDashboardMetric: (metric: DashboardMetric) => void;
  setDashboardProvider: (provider: ProviderFilter) => void;
  setDashboardYear: (year: number) => void;
};

export const useUIStore = create<UIState>((set) => ({
  profileMenuOpen: false,
  dashboardMetric: "commits",
  dashboardProvider: "all",
  dashboardYear: null,
  setProfileMenuOpen: (open) => set({ profileMenuOpen: open }),
  toggleProfileMenu: () => set((state) => ({ profileMenuOpen: !state.profileMenuOpen })),
  setDashboardMetric: (dashboardMetric) => set({ dashboardMetric }),
  setDashboardProvider: (dashboardProvider) => set({ dashboardProvider }),
  setDashboardYear: (dashboardYear) => set({ dashboardYear }),
}));
