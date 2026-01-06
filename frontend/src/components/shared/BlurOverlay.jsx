import "./BlurOverlay.css";

/**
 * BlurOverlay - Adds a blur effect to content and disables interactions
 * @param {boolean} isActive - Whether the blur overlay is active
 * @param {React.ReactNode} children - Content to be blurred
 * @param {string} message - Optional message to display on the overlay
 */
const BlurOverlay = ({ isActive = true, children, message }) => {
  if (!isActive) {
    return <>{children}</>;
  }

  return (
    <div className="blur-overlay-wrapper">
      <div className="blur-overlay-content">{children}</div>
      <div className="blur-overlay-mask">
        {message && <div className="blur-overlay-message">{message}</div>}
      </div>
    </div>
  );
};

export default BlurOverlay;
