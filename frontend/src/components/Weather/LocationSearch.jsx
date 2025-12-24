import "./LocationSearch.css";
import { ProfileContext } from "../../utils/ProfileContext";
import { useContext } from "react";

const LocationSearch = ({
  location,
  handleInputChange,
  handleKeyDown,
  handleBlur,
  suggestions,
  handleSuggestionClick,
}) => {
  const { profile } = useContext(ProfileContext);

  const getFirstName = () => {
    if (profile) {
      const { first_name } = profile;
      if (first_name) {
        return first_name;
      }
    }
    return "User";
  };

  const getGreeting = () => {
    const currentHour = new Date().getHours();
    if (currentHour >= 5 && currentHour < 12) {
      return "Good morning";
    } else if (currentHour >= 12 && currentHour < 18) {
      return "Good afternoon";
    } else if (currentHour >= 18 && currentHour < 22) {
      return "Good evening";
    } else {
      return "Good night";
    }
  };

  return (
    <div className="search-bar">
      <h1 style={{ fontStyle: "oblique" }}>
        {getGreeting()}, {getFirstName()}
      </h1>
      <div className="search-input-wrapper">
        <i className="bi bi-search search-icon"></i>
        <input
          type="text"
          placeholder="Search a location . . ."
          className="search-input"
          value={location}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
        />
        {suggestions.length > 0 && (
          <ul className="suggestions-list">
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                onMouseDown={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default LocationSearch;
