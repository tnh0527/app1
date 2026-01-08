/**
 * Header Context
 *
 * Provides global state and actions for the dynamic header.
 * Allows child components to customize header content.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from "react";

const HeaderContext = createContext(null);

/**
 * HeaderProvider component
 *
 * Provides header state and actions to children.
 */
export function HeaderProvider({ children }) {
  // Custom title override (set by pages if needed)
  const [customTitle, setCustomTitle] = useState(null);

  // Custom subtitle override
  const [customSubtitle, setCustomSubtitle] = useState(null);

  // Custom actions (merged with route defaults)
  const [customActions, setCustomActions] = useState([]);

  // Loading state for refresh action
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Notification count
  const [notificationCount, setNotificationCount] = useState(0);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // Action handlers registered by pages
  const [actionHandlers, setActionHandlers] = useState({});

  /**
   * Register an action handler
   */
  const registerActionHandler = useCallback((actionId, handler) => {
    setActionHandlers((prev) => ({
      ...prev,
      [actionId]: handler,
    }));
  }, []);

  /**
   * Unregister an action handler
   */
  const unregisterActionHandler = useCallback((actionId) => {
    setActionHandlers((prev) => {
      const next = { ...prev };
      delete next[actionId];
      return next;
    });
  }, []);

  /**
   * Execute an action by ID
   */
  const executeAction = useCallback(
    async (actionId) => {
      const handler = actionHandlers[actionId];
      if (handler) {
        if (actionId === "refresh") {
          setIsRefreshing(true);
          try {
            await handler();
          } finally {
            setIsRefreshing(false);
          }
        } else {
          await handler();
        }
      }
    },
    [actionHandlers]
  );

  /**
   * Reset all custom overrides
   */
  const resetCustomizations = useCallback(() => {
    setCustomTitle(null);
    setCustomSubtitle(null);
    setCustomActions([]);
    setSearchQuery("");
  }, []);

  const value = useMemo(
    () => ({
      // State
      customTitle,
      customSubtitle,
      customActions,
      isRefreshing,
      notificationCount,
      searchQuery,
      isSearchVisible,
      actionHandlers,

      // Setters
      setCustomTitle,
      setCustomSubtitle,
      setCustomActions,
      setNotificationCount,
      setSearchQuery,
      setIsSearchVisible,

      // Actions
      registerActionHandler,
      unregisterActionHandler,
      executeAction,
      resetCustomizations,
    }),
    [
      customTitle,
      customSubtitle,
      customActions,
      isRefreshing,
      notificationCount,
      searchQuery,
      isSearchVisible,
      actionHandlers,
      registerActionHandler,
      unregisterActionHandler,
      executeAction,
      resetCustomizations,
    ]
  );

  return (
    <HeaderContext.Provider value={value}>{children}</HeaderContext.Provider>
  );
}

/**
 * useHeader hook
 *
 * Access header context from any component.
 */
export function useHeader() {
  const context = useContext(HeaderContext);
  if (!context) {
    throw new Error("useHeader must be used within a HeaderProvider");
  }
  return context;
}

/**
 * useHeaderAction hook
 *
 * Register an action handler that auto-cleans up on unmount.
 */
export function useHeaderAction(actionId, handler) {
  const { registerActionHandler, unregisterActionHandler } = useHeader();

  // Register on mount, cleanup on unmount
  React.useEffect(() => {
    if (actionId && handler) {
      registerActionHandler(actionId, handler);
      return () => unregisterActionHandler(actionId);
    }
  }, [actionId, handler, registerActionHandler, unregisterActionHandler]);
}

// Need to import React for useEffect in useHeaderAction
import React from "react";

export default {
  HeaderProvider,
  useHeader,
  useHeaderAction,
};
