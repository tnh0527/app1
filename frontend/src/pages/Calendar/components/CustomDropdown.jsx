import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import "./CustomDropdown.css";

const CustomDropdown = ({
  options = [],
  value = "",
  onChange,
  placeholder = "Select an option...",
  className = "",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: "auto", bottom: "auto" });
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  // Calculate menu position and detect if it should open upward
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const menuHeight = 300; // max-height of menu
      const spaceBelow = viewportHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;

      // If not enough space below but enough space above, open upward
      if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
        setMenuPosition({
          bottom: `${window.innerHeight - triggerRect.top + 4}px`,
          top: "auto",
        });
      } else {
        setMenuPosition({
          top: `${triggerRect.bottom + 4}px`,
          bottom: "auto",
        });
      }
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const getMenuStyle = () => {
    if (!isOpen || !triggerRef.current) return {};
    const triggerRect = triggerRef.current.getBoundingClientRect();
    return {
      position: "fixed",
      left: `${triggerRect.left}px`,
      width: `${triggerRect.width}px`,
      ...menuPosition,
    };
  };

  return (
    <>
      <div
        className={`custom-dropdown ${isOpen ? "custom-dropdown--open" : ""} ${className}`}
        ref={dropdownRef}
      >
        <button
          ref={triggerRef}
          type="button"
          className="custom-dropdown-trigger"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
        >
          <span className={selectedOption ? "" : "custom-dropdown-placeholder"}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <i
            className={`bi bi-chevron-down custom-dropdown-arrow ${
              isOpen ? "custom-dropdown-arrow--open" : ""
            }`}
          ></i>
        </button>
      </div>
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className={`custom-dropdown-menu ${
              menuPosition.bottom !== "auto" ? "custom-dropdown-menu--upward" : ""
            }`}
            style={getMenuStyle()}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`custom-dropdown-item ${
                  value === option.value ? "custom-dropdown-item--selected" : ""
                }`}
                onClick={() => handleSelect(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </>
  );
};

export default CustomDropdown;

