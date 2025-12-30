import { useMemo, useState, useEffect } from "react";
import "./WeatherEffects.css";

// Duration in milliseconds for the weather effects to show on page navigation
const EFFECTS_DISPLAY_DURATION = 3000; // 3 seconds

// Anomaly thresholds (in Fahrenheit for temp, mph for wind)
const THRESHOLDS = {
  EXTREME_HEAT: 100, // 100°F+ = scorching
  VERY_HOT: 95, // 95°F+ = very hot
  VERY_COLD: 20, // 20°F or below = freezing
  EXTREME_COLD: 5, // 5°F or below = extreme freeze
  HIGH_WIND: 25, // 25+ mph = windy
  EXTREME_WIND: 40, // 40+ mph = very windy/gusty
  STORM_WIND: 55, // 55+ mph = dangerous wind
};

// Boring conditions that can be overridden by anomalies
const BORING_CONDITIONS = ["cloudy", "overcast", "partly", "mostly", "clear"];

// Map weather condition strings to base effect types
const getBaseEffectType = (condition) => {
  if (!condition) return null;
  const c = condition.toLowerCase();

  if (c.includes("thunder") || c.includes("storm")) return "thunderstorm";
  if (c.includes("rain") || c.includes("drizzle") || c.includes("shower")) {
    return c.includes("heavy") ||
      c.includes("violent") ||
      c.includes("moderate")
      ? "rain-heavy"
      : "rain";
  }
  if (
    c.includes("snow") ||
    c.includes("sleet") ||
    c.includes("ice") ||
    c.includes("hail")
  ) {
    return c.includes("heavy") || c.includes("blizzard")
      ? "snow-heavy"
      : "snow";
  }
  if (
    c.includes("fog") ||
    c.includes("mist") ||
    c.includes("haze") ||
    c.includes("smoke")
  ) {
    return "fog";
  }
  if (c.includes("clear") || c.includes("sunny") || c.includes("fair")) {
    return "clear";
  }
  if (
    c.includes("overcast") ||
    c.includes("cloud") ||
    c.includes("partly") ||
    c.includes("mostly")
  ) {
    return "cloudy";
  }
  return null;
};

// Check if condition is "boring" and can be overridden
const isBoringCondition = (condition) => {
  if (!condition) return true;
  const c = condition.toLowerCase();
  return BORING_CONDITIONS.some((boring) => c.includes(boring));
};

// Determine active effects based on all weather factors
const getActiveEffects = (condition, temperature, windSpeed, feelsLike) => {
  const baseEffect = getBaseEffectType(condition);
  const effects = [];
  const isBoring = isBoringCondition(condition);

  // Always include base effect if it's dramatic (not boring)
  if (baseEffect && !isBoring) {
    effects.push({ type: baseEffect, priority: 1 });
  }

  // Temperature anomalies (override boring conditions)
  if (temperature !== null && temperature !== undefined) {
    if (temperature >= THRESHOLDS.EXTREME_HEAT) {
      effects.push({ type: "extreme-heat", priority: 3 });
    } else if (temperature >= THRESHOLDS.VERY_HOT) {
      effects.push({ type: "heat-haze", priority: 2 });
    } else if (temperature <= THRESHOLDS.EXTREME_COLD) {
      effects.push({ type: "extreme-freeze", priority: 3 });
    } else if (temperature <= THRESHOLDS.VERY_COLD) {
      effects.push({ type: "freezing", priority: 2 });
    }
  }

  // Wind anomalies (override boring conditions)
  if (windSpeed !== null && windSpeed !== undefined) {
    if (windSpeed >= THRESHOLDS.STORM_WIND) {
      effects.push({ type: "storm-wind", priority: 3 });
    } else if (windSpeed >= THRESHOLDS.EXTREME_WIND) {
      effects.push({ type: "high-wind", priority: 2 });
    } else if (windSpeed >= THRESHOLDS.HIGH_WIND) {
      effects.push({ type: "windy", priority: 1.5 });
    }
  }

  // Feels-like temperature difference anomaly (wind chill or heat index)
  if (temperature !== null && feelsLike !== null) {
    const diff = Math.abs(feelsLike - temperature);
    if (diff >= 15) {
      // If feels much colder (wind chill)
      if (feelsLike < temperature && feelsLike <= 25) {
        effects.push({ type: "wind-chill", priority: 2 });
      }
      // If feels much hotter (humidity/heat index)
      if (feelsLike > temperature && feelsLike >= 95) {
        effects.push({ type: "heat-index", priority: 2 });
      }
    }
  }

  // If no dramatic effects, fall back to base effect
  if (effects.length === 0 && baseEffect) {
    effects.push({ type: baseEffect, priority: 0 });
  }

  // Sort by priority (highest first) and return unique effects
  return [
    ...new Map(
      effects.sort((a, b) => b.priority - a.priority).map((e) => [e.type, e])
    ).values(),
  ];
};

// Generate particle configurations
const generateParticles = (count, config) =>
  [...Array(count)].map((_, i) => ({ id: i, ...config(i) }));

const WeatherEffects = ({ condition, temperature, windSpeed, feelsLike }) => {
  // State to control visibility - effects only show for 3 seconds on mount
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Start fade-out transition slightly before hiding
    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, EFFECTS_DISPLAY_DURATION - 500); // Start fading 500ms before hiding

    // Hide effects after duration
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, EFFECTS_DISPLAY_DURATION);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []); // Empty dependency array = only on mount

  const activeEffects = useMemo(
    () => getActiveEffects(condition, temperature, windSpeed, feelsLike),
    [condition, temperature, windSpeed, feelsLike]
  );

  // Get the primary effect type for base rendering
  const primaryEffect = activeEffects[0]?.type || null;

  // Check for specific effect types
  const hasEffect = (type) => activeEffects.some((e) => e.type === type);

  const particles = useMemo(
    () => ({
      // Rain: thin streaks with slight angle
      rain: generateParticles(100, () => ({
        x: Math.random() * 100,
        delay: Math.random() * 3,
        duration: 0.4 + Math.random() * 0.3,
        length: 15 + Math.random() * 10,
      })),
      rainHeavy: generateParticles(180, () => ({
        x: Math.random() * 100,
        delay: Math.random() * 2,
        duration: 0.25 + Math.random() * 0.2,
        length: 20 + Math.random() * 15,
      })),
      // Snow: small glowing dots
      snow: generateParticles(80, () => ({
        x: Math.random() * 100,
        delay: Math.random() * 12,
        duration: 8 + Math.random() * 8,
        size: 2 + Math.random() * 3,
        opacity: 0.4 + Math.random() * 0.4,
        drift: 20 + Math.random() * 40,
      })),
      snowHeavy: generateParticles(150, () => ({
        x: Math.random() * 100,
        delay: Math.random() * 8,
        duration: 5 + Math.random() * 5,
        size: 3 + Math.random() * 4,
        opacity: 0.5 + Math.random() * 0.5,
        drift: 30 + Math.random() * 60,
      })),
      // Ambient particles for clear/cloudy
      ambient: generateParticles(30, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 10,
        duration: 15 + Math.random() * 20,
        size: 1 + Math.random() * 2,
      })),
      // Wind streaks
      wind: generateParticles(25, () => ({
        y: Math.random() * 100,
        delay: Math.random() * 5,
        duration: 1.5 + Math.random() * 0.88,
        length: 60 + Math.random() * 100,
        opacity: 0.15 + Math.random() * 0.2,
      })),
      windHeavy: generateParticles(45, () => ({
        y: Math.random() * 100,
        delay: Math.random() * 4,
        duration: 2 + Math.random() * 1.5,
        length: 100 + Math.random() * 150,
        opacity: 0.2 + Math.random() * 0.25,
      })),
      // Heat shimmer waves
      heatWaves: generateParticles(8, (i) => ({
        y: 60 + i * 5,
        delay: i * 0.8,
        duration: 3 + Math.random() * 2,
      })),
      // Frost crystals
      frost: generateParticles(40, () => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 8,
        duration: 4 + Math.random() * 4,
        size: 3 + Math.random() * 5,
        rotation: Math.random() * 360,
      })),
    }),
    []
  );

  if (activeEffects.length === 0 || !isVisible) return null;

  return (
    <div
      className={`weather-fx ${isFadingOut ? "weather-fx--fading" : ""}`}
      data-effects={activeEffects.map((e) => e.type).join(" ")}
    >
      {/* RAIN */}
      {(hasEffect("rain") || hasEffect("rain-heavy")) && (
        <div className="fx-layer fx-rain">
          {(hasEffect("rain-heavy") ? particles.rainHeavy : particles.rain).map(
            (p) => (
              <div
                key={p.id}
                className="rain-streak"
                style={{
                  left: `${p.x}%`,
                  animationDelay: `${p.delay}s`,
                  animationDuration: `${p.duration}s`,
                  height: `${p.length}px`,
                }}
              />
            )
          )}
          {hasEffect("rain-heavy") && <div className="rain-mist" />}
        </div>
      )}

      {/* SNOW */}
      {(hasEffect("snow") || hasEffect("snow-heavy")) && (
        <div className="fx-layer fx-snow">
          {(hasEffect("snow-heavy") ? particles.snowHeavy : particles.snow).map(
            (p) => (
              <div
                key={p.id}
                className="snow-particle"
                style={{
                  left: `${p.x}%`,
                  animationDelay: `${p.delay}s`,
                  animationDuration: `${p.duration}s`,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  opacity: p.opacity,
                  "--drift": `${p.drift}px`,
                }}
              />
            )
          )}
        </div>
      )}

      {/* THUNDERSTORM */}
      {hasEffect("thunderstorm") && (
        <div className="fx-layer fx-storm">
          {particles.rainHeavy.map((p) => (
            <div
              key={p.id}
              className="rain-streak storm"
              style={{
                left: `${p.x}%`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                height: `${p.length}px`,
              }}
            />
          ))}
          <div className="lightning-layer">
            <div className="lightning l1" />
            <div className="lightning l2" />
          </div>
          <div className="rain-mist storm" />
        </div>
      )}

      {/* FOG */}
      {hasEffect("fog") && (
        <div className="fx-layer fx-fog">
          <div className="fog-band b1" />
          <div className="fog-band b2" />
          <div className="fog-band b3" />
        </div>
      )}

      {/* CLEAR (only if no anomaly overrides) */}
      {hasEffect("clear") &&
        !hasEffect("heat-haze") &&
        !hasEffect("extreme-heat") && (
          <div className="fx-layer fx-clear">
            <div className="sun-flare" />
            {particles.ambient.map((p) => (
              <div
                key={p.id}
                className="dust-mote"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  animationDelay: `${p.delay}s`,
                  animationDuration: `${p.duration}s`,
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                }}
              />
            ))}
          </div>
        )}

      {/* CLOUDY / OVERCAST (only if no anomaly overrides) */}
      {hasEffect("cloudy") &&
        !hasEffect("windy") &&
        !hasEffect("high-wind") &&
        !hasEffect("storm-wind") &&
        !hasEffect("heat-haze") &&
        !hasEffect("freezing") && (
          <div className="fx-layer fx-cloudy">
            <div className="cloud-drift c1" />
            <div className="cloud-drift c2" />
            <div className="cloud-drift c3" />
          </div>
        )}

      {/* === ANOMALY EFFECTS === */}

      {/* WIND EFFECTS */}
      {(hasEffect("windy") ||
        hasEffect("high-wind") ||
        hasEffect("storm-wind")) && (
        <div className="fx-layer fx-wind">
          {(hasEffect("storm-wind") || hasEffect("high-wind")
            ? particles.windHeavy
            : particles.wind
          ).map((p) => (
            <div
              key={p.id}
              className={`wind-streak ${
                hasEffect("storm-wind") ? "extreme" : ""
              }`}
              style={{
                top: `${p.y}%`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                width: `${p.length}px`,
                opacity: p.opacity,
              }}
            />
          ))}
          {/* Flying debris for storm wind */}
          {hasEffect("storm-wind") && (
            <div className="debris-layer">
              {particles.ambient.slice(0, 12).map((p) => (
                <div
                  key={`debris-${p.id}`}
                  className="debris-particle"
                  style={{
                    top: `${p.y}%`,
                    animationDelay: `${p.delay * 0.3}s`,
                    animationDuration: `${1.5 + Math.random()}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* HEAT EFFECTS */}
      {(hasEffect("heat-haze") ||
        hasEffect("extreme-heat") ||
        hasEffect("heat-index")) && (
        <div className="fx-layer fx-heat">
          {/* Heat shimmer waves */}
          {particles.heatWaves.map((p) => (
            <div
              key={p.id}
              className={`heat-wave ${
                hasEffect("extreme-heat") ? "intense" : ""
              }`}
              style={{
                top: `${p.y}%`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
              }}
            />
          ))}
          {/* Sun glow */}
          <div
            className={`heat-glow ${
              hasEffect("extreme-heat") ? "extreme" : ""
            }`}
          />
          {/* Hot air distortion */}
          {hasEffect("extreme-heat") && <div className="heat-distortion" />}
        </div>
      )}

      {/* COLD/FREEZE EFFECTS */}
      {(hasEffect("freezing") ||
        hasEffect("extreme-freeze") ||
        hasEffect("wind-chill")) && (
        <div className="fx-layer fx-freeze">
          {/* Frost crystals */}
          {particles.frost.map((p) => (
            <div
              key={p.id}
              className={`frost-crystal ${
                hasEffect("extreme-freeze") ? "intense" : ""
              }`}
              style={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                width: `${p.size}px`,
                height: `${p.size}px`,
                "--rotation": `${p.rotation}deg`,
              }}
            />
          ))}
          {/* Cold breath mist */}
          <div
            className={`cold-mist ${
              hasEffect("extreme-freeze") ? "heavy" : ""
            }`}
          />
          {/* Frost border overlay */}
          {hasEffect("extreme-freeze") && <div className="frost-border" />}
          {/* Wind chill streaks */}
          {hasEffect("wind-chill") && (
            <div className="chill-streaks">
              {particles.wind.slice(0, 15).map((p) => (
                <div
                  key={`chill-${p.id}`}
                  className="chill-streak"
                  style={{
                    top: `${p.y}%`,
                    animationDelay: `${p.delay}s`,
                    animationDuration: `${p.duration * 1.2}s`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WeatherEffects;
