import "./LocationSearch.css";

const LocationSearch = ({
  location,
  handleInputChange,
  handleKeyDown,
  handleBlur,
  suggestions,
  handleSuggestionClick,
}) => {
  const mapsUrl = location?.trim()
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        location.trim()
      )}`
    : null;

  return (
    <div className="search-bar">
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
        {mapsUrl && (
          <a
            className="location-external-link"
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in Google Maps"
            onMouseDown={(e) => e.preventDefault()}
          >
            <i className="bi bi-box-arrow-up-right"></i>
          </a>
        )}
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
