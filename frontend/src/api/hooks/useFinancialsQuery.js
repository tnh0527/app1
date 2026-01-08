/**
 * React Query Hooks for Financials API
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys, STALE_TIMES } from "../queryClient";
import api from "../axios";

/**
 * Fetch full financials dashboard data
 */
export function useFinancialsDashboard(range = "1y", options = {}) {
  return useQuery({
    queryKey: queryKeys.financials.dashboard(range),
    queryFn: async () => {
      const response = await api.get("/api/financials/dashboard/", {
        params: { range },
      });
      return response.data;
    },
    staleTime: STALE_TIMES.financialsSummary,
    ...options,
  });
}

/**
 * Fetch financial accounts
 */
export function useFinancialAccounts(options = {}) {
  return useQuery({
    queryKey: queryKeys.financials.accounts(),
    queryFn: async () => {
      const response = await api.get("/api/financials/accounts/");
      return response.data;
    },
    staleTime: STALE_TIMES.financials,
    ...options,
  });
}

/**
 * Fetch single account detail
 */
export function useFinancialAccount(accountId, options = {}) {
  return useQuery({
    queryKey: queryKeys.financials.account(accountId),
    queryFn: async () => {
      const response = await api.get(`/api/financials/accounts/${accountId}/`);
      return response.data;
    },
    enabled: !!accountId,
    staleTime: STALE_TIMES.financials,
    ...options,
  });
}

/**
 * Fetch financials summary
 */
export function useFinancialsSummary(options = {}) {
  return useQuery({
    queryKey: queryKeys.financials.summary(),
    queryFn: async () => {
      const response = await api.get("/api/financials/summary/");
      return response.data;
    },
    staleTime: STALE_TIMES.financialsSummary,
    ...options,
  });
}

/**
 * Fetch timeline data
 */
export function useFinancialsTimeline(range = "1y", options = {}) {
  return useQuery({
    queryKey: queryKeys.financials.timeline(range),
    queryFn: async () => {
      const response = await api.get("/api/financials/timeline/", {
        params: { range },
      });
      return response.data;
    },
    staleTime: STALE_TIMES.financialsSummary,
    ...options,
  });
}

/**
 * Fetch milestones
 */
export function useFinancialsMilestones(options = {}) {
  return useQuery({
    queryKey: queryKeys.financials.milestones(),
    queryFn: async () => {
      const response = await api.get(
        "/api/financials/milestones/with-progress/"
      );
      return response.data;
    },
    staleTime: STALE_TIMES.financials,
    ...options,
  });
}

/**
 * Create/update account mutation
 */
export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountData) => {
      const response = await api.post("/api/financials/accounts/", accountData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financials.all });
    },
  });
}

/**
 * Update account value mutation
 */
export function useUpdateAccountValue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ accountId, value, recordedAt }) => {
      const response = await api.post(
        `/api/financials/accounts/${accountId}/update-value/`,
        { value, recorded_at: recordedAt }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financials.all });
    },
  });
}

/**
 * Delete account mutation
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (accountId) => {
      await api.delete(`/api/financials/accounts/${accountId}/`);
      return accountId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financials.all });
    },
  });
}

export default {
  useFinancialsDashboard,
  useFinancialAccounts,
  useFinancialAccount,
  useFinancialsSummary,
  useFinancialsTimeline,
  useFinancialsMilestones,
  useCreateAccount,
  useUpdateAccountValue,
  useDeleteAccount,
};
