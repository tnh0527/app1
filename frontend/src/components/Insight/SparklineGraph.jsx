import { useEffect, useRef } from "react";
import Chart from "chart.js/auto";

const readTheme = () => {
  if (typeof window === "undefined") {
    return {
      muted: "#bdbabb",
      up: "#4caf50",
      down: "#ff6347",
    };
  }
  const styles = getComputedStyle(document.documentElement);
  return {
    muted: styles.getPropertyValue("--clr-silver-v1")?.trim() || "#bdbabb",
    up: styles.getPropertyValue("--clr-green")?.trim() || "#4caf50",
    down: styles.getPropertyValue("--clr-scarlet")?.trim() || "#ff6347",
  };
};

const colorToRgba = (color, alpha) => {
  if (!color) return `rgba(255,255,255,${alpha})`;

  const c = String(color).trim();
  if (c.startsWith("rgba(")) {
    return c.replace(/rgba\(([^)]+)\)/, (m, inner) => {
      const parts = inner.split(",").map((p) => p.trim());
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
    });
  }

  if (c.startsWith("rgb(")) {
    return c.replace(/rgb\(([^)]+)\)/, (m, inner) => {
      const parts = inner.split(",").map((p) => p.trim());
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
    });
  }

  const hex = c.startsWith("#") ? c.slice(1) : c;
  const norm =
    hex.length === 3
      ? hex
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : hex;
  if (norm.length !== 6) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(norm.slice(0, 2), 16);
  const g = parseInt(norm.slice(2, 4), 16);
  const b = parseInt(norm.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const to12Hour = (time) => {
  if (!time || typeof time !== "string" || !time.includes(":")) return time;
  const [hourStr, minuteStr] = time.split(":");
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return time;
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute < 10 ? "0" : ""}${minute} ${suffix}`;
};

const SparklineGraph = ({ data, isPositive }) => {
  const canvasRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (!data || !Array.isArray(data.labels) || !Array.isArray(data.values)) {
      return undefined;
    }

    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;

    if (chartInstance.current) {
      chartInstance.current.destroy();
      chartInstance.current = null;
    }

    const theme = readTheme();
    const borderColor = isPositive ? theme.up : theme.down;
    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    gradient.addColorStop(0.05, colorToRgba(borderColor, 0.35));
    gradient.addColorStop(0.3, colorToRgba(borderColor, 0));

    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            data: data.values,
            borderColor,
            borderWidth: 1.5,
            backgroundColor: gradient,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 2,
          },
          ...(typeof data.openPrice === "number"
            ? [
                {
                  data: Array(data.labels.length).fill(data.openPrice),
                  borderColor: theme.muted,
                  borderDash: [5, 5],
                  borderWidth: 1,
                  pointRadius: 0,
                },
              ]
            : []),
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (context) => to12Hour(context?.[0]?.label),
              label: (context) => {
                const value = context?.parsed?.y;
                if (typeof value !== "number") return "";
                return `$${value.toFixed(2)}`;
              },
            },
            displayColors: false,
          },
        },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
    };
  }, [data, isPositive]);

  return <canvas ref={canvasRef} className="sparkline-canvas" />;
};

export default SparklineGraph;
