import { useEffect, useRef } from "react";
import "./SearchModal.css";

const SearchModal = ({
  isOpen,
  onClose,
  location,
  handleInputChange,
  handleKeyDown,
  suggestions,
  handleSuggestionClick,
}) => {
  const inputRef = useRef(null);
  const modalRef = useRef(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    if (isOpen) {
      setTimeout(() => {
        window.addEventListener("mousedown", handleClickOutside);
      }, 100);
    }
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const mapsUrl = location?.trim()
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        location.trim()
      )}`
    : null;

  return (
    <div className="search-modal-overlay">
      <div className="search-modal" ref={modalRef}>
        <div className="search-modal-header">
          <h3>Search Location</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        <div className="search-modal-content">
          <div className="modal-search-input-wrapper">
            <i className="bi bi-search modal-search-icon"></i>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search a location . . ."
              className="modal-search-input"
              value={location}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
            />
            {mapsUrl && (
              <a
                className="modal-location-link"
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in Google Maps"
                onMouseDown={(e) => e.preventDefault()}
              >
                <i className="bi bi-box-arrow-up-right"></i>
              </a>
            )}
          </div>

          {suggestions.length > 0 && (
            <ul className="modal-suggestions-list">
              {suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  onMouseDown={() => {
                    handleSuggestionClick(suggestion);
                    onClose();
                  }}
                >
                  <i className="bi bi-geo-alt"></i>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchModal;
