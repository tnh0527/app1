import "./WeatherModal.css";

const WeatherModal = ({ isOpen, onClose, title, data }) => {
  if (!isOpen) return null;

  // Helper to format data nicely
  const renderData = (inputData) => {
    if (inputData === undefined || inputData === null) return <p>No data available</p>;

    let dataToRender = inputData;

    // Unwrap if it's a single key object containing an array (common pattern from CardSlot)
    if (typeof inputData === 'object' && !Array.isArray(inputData)) {
        const keys = Object.keys(inputData);
        if (keys.length === 1 && Array.isArray(inputData[keys[0]])) {
            dataToRender = inputData[keys[0]];
        }
    }

    if (Array.isArray(dataToRender)) {
      if (dataToRender.length === 0) return <p>Empty data set</p>;
      
      // Check if items are objects
      if (typeof dataToRender[0] === 'object' && dataToRender[0] !== null) {
          // Get headers from first item
          const headers = Object.keys(dataToRender[0]);

          return (
            <div className="data-table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    {headers.map(key => <th key={key}>{key.replace(/_/g, ' ').toUpperCase()}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {dataToRender.slice(0, 24).map((item, index) => ( // Show first 24 hours/items
                    <tr key={index}>
                      {headers.map(key => {
                        let val = item[key];
                        if (key === 'time' && typeof val === 'string') {
                            val = val.replace('T', ' ');
                        }
                        // Recursive call for nested objects/arrays in table cells? 
                        // For now, just stringify if it's complex, but usually it's simple values.
                        return <td key={key}>{typeof val === 'object' && val !== null ? JSON.stringify(val) : val}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
              {dataToRender.length > 24 && <p style={{textAlign: 'center', color: '#888', marginTop: '10px'}}>Showing first 24 entries...</p>}
            </div>
          );
      } else {
          // Array of primitives
          return (
              <div className="data-grid">
                  {dataToRender.map((item, idx) => (
                      <div key={idx} className="data-card"><span>{item}</span></div>
                  ))}
              </div>
          )
      }
    } else if (typeof dataToRender === 'object') {
       return (
        <div className="data-grid">
           {Object.entries(dataToRender).map(([key, value]) => {
                // If the value is an array (table), make it span full width
                const isArray = Array.isArray(value);
                const style = isArray ? { gridColumn: '1 / -1' } : {};

                return (
                    <div key={key} className="data-card" style={style}>
                    <strong>{key.replace(/_/g, ' ').toUpperCase()}</strong>
                    {/* Recursive rendering for nested objects */}
                    {typeof value === 'object' && value !== null ? (
                        <div className="nested-data">
                            {renderData(value)}
                        </div>
                    ) : (
                        <span>{value}</span>
                    )}
                    </div>
                );
           })}
        </div>
       )
    }
    return <span>{String(dataToRender)}</span>;
  };

  return (
    <div className="weather-modal-overlay" onClick={onClose}>
      <div className="weather-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
            <h2>{title.replace('_', ' ').toUpperCase()} Details</h2>
            <button className="close-button" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {renderData(data)}
        </div>
      </div>
    </div>
  );
};

export default WeatherModal;
