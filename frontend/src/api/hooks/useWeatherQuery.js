/**
 * React Query Hooks for Weather API
 *
 * Custom hooks that integrate React Query with the weather API,
 * providing caching, deduplication, and smart refetching.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys, STALE_TIMES, invalidateQueries } from "./queryClient";
import api from "./axios";

/**
 * Fetch full weather data for a location
 */
export function useWeather(location, options = {}) {
  return useQuery({
    queryKey: queryKeys.weather.full(location),
    queryFn: async () => {
      if (!location) return null;

      // Support both string location and lat/lng object
      const params =
        typeof location === "object"
          ? { lat: location.lat, lon: location.lng || location.lon }
          : { location };

      const response = await api.get("/api/weather/", { params });
      return response.data;
    },
    enabled: !!location,
    staleTime: STALE_TIMES.weather,
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
    ...options,
  });
}

/**
 * Fetch saved locations for the user
 */
export function useSavedLocations(options = {}) {
  return useQuery({
    queryKey: queryKeys.weather.savedLocations(),
    queryFn: async () => {
      const response = await api.get("/api/locations/");
      return response.data;
    },
    staleTime: STALE_TIMES.static,
    ...options,
  });
}

/**
 * Mutation to save a new location
 */
export function useSaveLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (locationData) => {
      const response = await api.post("/api/locations/", locationData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.weather.savedLocations(),
      });
    },
  });
}

/**
 * Mutation to delete a saved location
 */
export function useDeleteLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (locationId) => {
      await api.delete(`/api/locations/${locationId}/`);
      return locationId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.weather.savedLocations(),
      });
    },
  });
}

/**
 * Mutation to set a location as primary
 */
export function useSetPrimaryLocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (locationId) => {
      const response = await api.post(
        `/api/locations/${locationId}/set-primary/`
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.weather.savedLocations(),
      });
    },
  });
}

/**
 * Fetch weather API status
 */
export function useWeatherApiStatus(options = {}) {
  return useQuery({
    queryKey: queryKeys.weather.apiStatus(),
    queryFn: async () => {
      const response = await api.get("/api/weather/api-status/");
      return response.data;
    },
    staleTime: STALE_TIMES.apiStatus,
    gcTime: 60 * 60 * 1000, // 1 hour
    ...options,
  });
}

/**
 * Prefetch weather data for a location
 * Use this to warm the cache before navigating
 */
export function usePrefetchWeather() {
  const queryClient = useQueryClient();

  return (location) => {
    if (!location) return;

    queryClient.prefetchQuery({
      queryKey: queryKeys.weather.full(location),
      queryFn: async () => {
        const params =
          typeof location === "object"
            ? { lat: location.lat, lon: location.lng || location.lon }
            : { location };

        const response = await api.get("/api/weather/", { params });
        return response.data;
      },
      staleTime: STALE_TIMES.weather,
    });
  };
}

export default {
  useWeather,
  useSavedLocations,
  useSaveLocation,
  useDeleteLocation,
  useSetPrimaryLocation,
  useWeatherApiStatus,
  usePrefetchWeather,
};
