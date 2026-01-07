import { useConnection } from "../../../contexts/ConnectionContext";
import { RETRY_INTERVAL } from "../../../contexts/ConnectionContext";
import { useEffect, useState, useRef } from "react";
import "./ConnectionStatus.css";

/**
 * ConnectionStatus - Displays connection state banner
 * Shows when backend is disconnected and attempts to reconnect automatically
 * Displays a live countdown and centered status text
 */
const ConnectionStatus = () => {
  const { isOnline, isReconnecting, reconnectAttempts } = useConnection();
  const [countdown, setCountdown] = useState(5);

  // Countdown logic: compute time remaining until next scheduled retry based on
  // when the schedule was triggered (reconnectAttempts change). This makes
  // the countdown reflect the actual retry timing done in ConnectionContext.
  const lastScheduleRef = useRef(null);
  useEffect(() => {
    // record the time when a new schedule was created
    lastScheduleRef.current = Date.now();

    // If online, nothing to do
    if (isOnline) {
      setCountdown(Math.ceil(RETRY_INTERVAL / 1000));
      return undefined;
    }

    const tick = () => {
      const now = Date.now();
      const scheduledAt = lastScheduleRef.current || now;
      const target = scheduledAt + RETRY_INTERVAL;
      const secsLeft = Math.max(0, Math.ceil((target - now) / 1000));
      setCountdown(
        secsLeft === 0 ? Math.ceil(RETRY_INTERVAL / 1000) : secsLeft
      );
    };

    // run immediately then every second
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [isOnline, reconnectAttempts]);

  // Don't show anything when online
  if (isOnline) return null;

  return (
    <div
      className={`connection-status-banner${
        isReconnecting ? " reconnecting" : ""
      }`}
    >
      <div className="connection-status-content centered">
        <div className="connection-status-info centered">
          <div className="connection-status-icon centered-icon">
            {isReconnecting ? (
              <div className="reconnect-spinner">
                <i className="bi bi-arrow-repeat"></i>
              </div>
            ) : (
              <i className="bi bi-wifi-off"></i>
            )}
          </div>

          <div className="connection-status-text">
            <span className="connection-status-title">
              {isReconnecting ? "Reconnecting" : "Connection Lost"}
            </span>
            <span className="connection-status-message">
              {isReconnecting
                ? `Attempt ${reconnectAttempts} — retrying in ${countdown}s`
                : `Unable to reach server — retrying in ${countdown}s`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectionStatus;
