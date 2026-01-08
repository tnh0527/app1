import React, { useEffect } from "react";
import { Outlet, useLocation, useMatches } from "react-router-dom";
import { getRouteConfig, resolveRouteConfig } from "../../config/routeConfig";

const TitleLayout = () => {
  const location = useLocation();
  const matches = useMatches();

  // Collect params from matched routes
  const mergedParams = matches.reduce(
    (acc, m) => ({ ...acc, ...(m.params || {}) }),
    {}
  );

  useEffect(() => {
    try {
      // Special-case root login page
      if (location.pathname === "/") {
        document.title = "Nexus";
        return;
      }

      const routeConfig = getRouteConfig(location.pathname, mergedParams);
      const resolved = resolveRouteConfig(
        routeConfig,
        mergedParams,
        new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      );

      if (resolved && resolved.title) {
        document.title = resolved.title;
      } else {
        document.title = "Nexus";
      }
    } catch (e) {
      document.title = "Nexus";
    }
  }, [location.pathname, JSON.stringify(mergedParams)]);

  return <Outlet />;
};

export default TitleLayout;
