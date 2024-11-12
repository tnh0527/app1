import React, { useEffect, useState, useRef } from "react";
import Chart from "chart.js/auto";

const Tickers = () => {
  const [stockIndex, setStockIndex] = useState(0);
  const [stocks, setStocks] = useState([]);
  const [stockGraphs, setStockGraphs] = useState([]);

  const fetchStockData = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/stock-data/");
      const data = await response.json();
      if (response.ok) {
        setStocks(data.stocks || []);
        setStockGraphs(data.stockGraphs || []);
      } else {
        throw new Error("Failed to fetch stock data");
      }
    } catch (error) {
      console.error("Error fetching stocks:", error);
    }
  };
  useEffect(() => {
    fetchStockData();
  }, []);

  const handleNextStock = () => {
    setStockIndex((prevIndex) => (prevIndex + 4) % stocks.length);
  };

  const visibleStocks = stocks.slice(stockIndex, stockIndex + 4);
  const visibleGraphs = stockGraphs.slice(stockIndex, stockIndex + 4);

  return (
    <div className="stock-portfolio">
      <button className="scroll-button" onClick={handleNextStock}>
        &#8250;
      </button>
      <div className="stock-cards-container">
        {visibleStocks.map((stock, index) => (
          <div key={index} className="stock-card visible">
            <h3>{stock.name}</h3>
            <span>Apple Inc.</span>
            <p className="price">{stock.value}</p>
            <div className="price-graph-container">
              <div
                className="stock-graph"
                style={{ overflow: "hidden", width: "100%" }}
              >
                {visibleGraphs[index] ? (
                  <SparklineGraph
                    data={{
                      ...visibleGraphs[index],
                      openPrice: stock.openPrice,
                    }}
                    isPositive={stock.positive}
                  />
                ) : (
                  <p>No graph available</p>
                )}
              </div>
            </div>
            <p
              className={`total-return ${
                stock.positive ? "positive" : "negative"
              }`}
            >
              {stock.return}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

const SparklineGraph = ({ data, isPositive }) => {
  console.log("data:", data);
  console.log(isPositive);
  const canvasRef = useRef(null);
  let chartInstance = useRef(null);

  useEffect(() => {
    if (!data || !data.label || !data.values) {
      return;
    }
    console.log("data passed", data);

    const ctx = canvasRef.current.getContext("2d");

    const borderColor = isPositive ? "#4caf50" : "#f44336";
    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);
    gradient.addColorStop(
      0,
      isPositive ? "rgba(76, 175, 80, 0.4)" : "rgba(244, 67, 54, 0.4)"
    );
    gradient.addColorStop(
      0.7,
      isPositive ? "rgba(76, 175, 80, 0.1)" : "rgba(244, 67, 54, 0.1)"
    );
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.label, // X-axis labels
        datasets: [
          {
            data: data.values, // Y-axis data
            borderColor: borderColor,
            backgroundColor: gradient,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
          },
          {
            data: Array(data.label.length).fill(data.openPrice),
            borderColor: "#aaaaaa", // Dashed line for open price
            borderDash: [5, 5],
            borderWidth: 1,
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: { display: false }, // Hide X-axis
          y: { display: false }, // Hide Y-axis
        },
      },
    });

    // Cleanup on unmount
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, isPositive]);

  return (
    <canvas
      ref={canvasRef}
      className="sparkline-canvas"
      style={{ width: "100%", height: "auto" }}
    />
  );
};

export default Tickers;
