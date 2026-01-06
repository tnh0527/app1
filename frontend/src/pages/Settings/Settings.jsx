import "./Settings.css";
import BlurOverlay from "../../components/shared/BlurOverlay";

const Settings = () => {
  return (
    <div className="settings-page">
      <BlurOverlay isActive={true} message="Settings features coming soon!">
        <div className="settings-container">
          <h3>Settings</h3>
          <p className="settings-muted">Settings are not configured yet.</p>
        </div>
      </BlurOverlay>
    </div>
  );
};

export default Settings;
