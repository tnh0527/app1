/**
 * Debounce Hook
 *
 * Provides debouncing for user inputs that trigger API calls,
 * preventing rapid successive requests.
 */

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Hook to debounce a value
 *
 * @param {any} value - The value to debounce
 * @param {number} delay - Delay in milliseconds (default 500ms)
 * @returns {any} The debounced value
 */
export function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook to create a debounced callback function
 *
 * @param {Function} callback - The function to debounce
 * @param {number} delay - Delay in milliseconds (default 500ms)
 * @returns {Function} The debounced function
 */
export function useDebouncedCallback(callback, delay = 500) {
  const timeoutRef = useRef(null);
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const debouncedCallback = useCallback(
    (...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * Hook for debounced search input
 *
 * @param {string} initialValue - Initial search value
 * @param {number} delay - Debounce delay (default 500ms)
 * @returns {Object} { value, debouncedValue, setValue, clear }
 */
export function useDebouncedSearch(initialValue = "", delay = 500) {
  const [value, setValue] = useState(initialValue);
  const debouncedValue = useDebounce(value, delay);

  const clear = useCallback(() => {
    setValue("");
  }, []);

  return {
    value,
    debouncedValue,
    setValue,
    clear,
  };
}

export default {
  useDebounce,
  useDebouncedCallback,
  useDebouncedSearch,
};
