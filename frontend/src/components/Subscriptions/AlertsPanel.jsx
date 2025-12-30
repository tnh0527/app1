import { alertsApi } from "../../api/subscriptionsApi";
import "./AlertsPanel.css";

const SEVERITY_CONFIG = {
  info: { icon: "bi-info-circle", class: "info" },
  warning: { icon: "bi-exclamation-triangle", class: "warning" },
  critical: { icon: "bi-exclamation-circle", class: "critical" },
};

export const AlertsPanel = ({ alerts, onRefresh }) => {
  const handleDismiss = async (alertId) => {
    try {
      await alertsApi.dismissEvent(alertId);
      onRefresh();
    } catch (error) {
      console.error("Failed to dismiss alert:", error);
    }
  };

  return (
    <div className="alerts-panel">
      <div className="panel-header">
        <h3 className="panel-title">
          <i className="bi bi-bell"></i>
          Alerts
          <span className="alert-count">{alerts.length}</span>
        </h3>
      </div>
      <div className="alerts-list">
        {alerts.map((alert) => {
          const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.info;
          return (
            <div key={alert.id} className={`alert-item ${config.class}`}>
              <div className="alert-icon">
                <i className={`bi ${config.icon}`}></i>
              </div>
              <div className="alert-content">
                <span className="alert-subscription">
                  {alert.subscription_name}
                </span>
                <p className="alert-message">{alert.message}</p>
                <span className="alert-time">
                  {new Date(alert.triggered_at).toLocaleDateString()}
                </span>
              </div>
              <button
                className="alert-dismiss"
                onClick={() => handleDismiss(alert.id)}
                title="Dismiss"
              >
                <i className="bi bi-x"></i>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AlertsPanel;

