/**
 * Hooks Index
 *
 * Export all custom React Query hooks from a single entry point.
 */

// Weather hooks
export {
  useWeather,
  useSavedLocations,
  useSaveLocation,
  useDeleteLocation,
  useSetPrimaryLocation,
  useWeatherApiStatus,
  usePrefetchWeather,
} from "./useWeatherQuery";

// Financials hooks
export {
  useFinancialsDashboard,
  useFinancialAccounts,
  useFinancialAccount,
  useFinancialsSummary,
  useFinancialsTimeline,
  useFinancialsMilestones,
  useCreateAccount,
  useUpdateAccountValue,
  useDeleteAccount,
} from "./useFinancialsQuery";

// Utility hooks
export {
  useDebounce,
  useDebouncedCallback,
  useDebouncedSearch,
} from "./useDebounce";
