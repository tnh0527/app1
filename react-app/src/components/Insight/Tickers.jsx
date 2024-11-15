import { useEffect, useState, useRef } from "react";
import Chart from "chart.js/auto";

const Tickers = () => {
  const [stockIndex, setStockIndex] = useState(0);
  const [stocks, setStocks] = useState([]);
  const [stockGraphs, setStockGraphs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStockData = async () => {
    const storedGraphData = localStorage.getItem("graph");
    const storedStockData = localStorage.getItem("stock");
    const storedGraphTimestamp = localStorage.getItem("graphTimestamp");
    setIsLoading(true);

    if (storedGraphData && storedStockData) {
      console.log("Fetching from cache");
      try {
        const parsedGraphData = JSON.parse(storedGraphData);
        const parsedStockData = JSON.parse(storedStockData);
        const timestamp = new Date(storedGraphTimestamp);
        const now = new Date();

        // data store for 30 mins
        if (now - timestamp < 30 * 60 * 1000) {
          setStocks(parsedStockData);
          setStockGraphs(parsedGraphData);
          setIsLoading(false);
          return;
        }
      } catch (error) {
        console.error("Failed to parse cached graph data", error);
      }
    }
    try {
      const response = await fetch("http://localhost:8000/api/stock-data/");
      const data = await response.json();
      if (response.ok) {
        setStocks(data.stocks || []);
        setStockGraphs(data.stockGraphs || []);

        localStorage.setItem("stock", JSON.stringify(data.stocks || []));
        localStorage.setItem("graph", JSON.stringify(data.stockGraphs || []));
        localStorage.setItem("graphTimestamp", new Date().toISOString());
        console.log("Data fetched:", data.stockGraphs);
      } else {
        throw new Error("Failed to fetch stock data");
      }
    } catch (error) {
      console.error("Error fetching stocks:", error);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchStockData();
  }, []);

  const handleNextStock = () => {
    setStockIndex((prevIndex) => (prevIndex + 1) % stocks.length);
  };

  const visibleStocks = stocks.slice(stockIndex, stockIndex + 4);
  if (visibleStocks.length < 4) {
    visibleStocks.push(...stocks.slice(0, 4 - visibleStocks.length));
  }

  const visibleGraphs = stockGraphs.slice(stockIndex, stockIndex + 4);
  if (visibleGraphs.length < 4) {
    visibleGraphs.push(...stockGraphs.slice(0, 4 - visibleGraphs.length));
  }

  return (
    <div className="stock-portfolio">
      <button className="scroll-button" onClick={handleNextStock}>
        &#8250;
      </button>
      <div className="stock-cards-container">
        {isLoading
          ? Array(4) // Render placeholders for 4 stocks
              .fill(null)
              .map((_, index) => <div key={index} className="skeleton"></div>)
          : visibleStocks.map((stock, index) => (
              <div key={index} className="stock-card visible">
                <span
                  style={{
                    fontStyle: "italic",
                    color: "#aaa",
                  }}
                >
                  {stock.name}
                </span>
                <div className="stocks-header">
                  <h3>
                    {stock.symbol}
                    <i
                      className={`bi bi-caret-${
                        stock.positive ? "up" : "down"
                      }-fill`}
                      style={{
                        color: stock.positive ? "lime" : "red",
                        paddingLeft: "5px",
                      }}
                    ></i>
                  </h3>
                  <p
                    className="total-return"
                    style={{
                      color: stock.positive ? "lime" : "red",
                      fontStyle: "italic",
                    }}
                  >
                    {stock.return}
                  </p>
                </div>
                <div className="price-info-container">
                  <img
                    src={`https://financialmodelingprep.com/image-stock/${stock.symbol}.png`}
                    alt={`${stock.symbol} logo`}
                    className="stock-logo"
                  />

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
                </div>
                <div className="price-info">
                  <p style={{ fontSize: "14px" }}>Price:</p>
                  <p
                    className="current-price"
                    style={{
                      fontWeight: "bold",
                      fontSize: "1.2em",
                      color: "#e0e0e0",
                    }}
                  >
                    {stock.value}
                  </p>
                </div>
                <div className="return-info">
                  <p style={{ fontSize: "14px" }}>Total Return:</p>
                  <p
                    className="total-return"
                    style={{
                      color: stock.positive ? "lime" : "red",
                      fontSize: "1em",
                    }}
                  >
                    {stock.positive ? "+" : ""}
                    {stock.change.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
      </div>
    </div>
  );
};

const SparklineGraph = ({ data, isPositive }) => {
  // console.log("data:", data);
  // console.log(isPositive);
  const canvasRef = useRef(null);
  let chartInstance = useRef(null);

  useEffect(() => {
    if (!data || !data.labels || !data.values) {
      return;
    }
    // console.log("data passed", data);

    const ctx = canvasRef.current.getContext("2d");

    const borderColor = isPositive ? "lime" : "red";
    const gradient = ctx.createLinearGradient(0, 0, 0, ctx.canvas.height);

    gradient.addColorStop(
      0.05,
      isPositive ? "rgba(76, 175, 80, 0.5)" : "rgba(255, 99, 71, 0.5)"
    );

    gradient.addColorStop(
      0.3,
      isPositive ? "rgba(76, 175, 80, 0)" : "rgba(255, 99, 71, 0)"
    );

    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: data.labels,
        datasets: [
          {
            data: data.values,
            borderColor: borderColor,
            borderWidth: 1.5,
            backgroundColor: gradient,
            fill: true,
            tension: 0.4,
            pointRadius: 0,
            pointHoverRadius: 2,
          },
          {
            data: Array(data.labels.length).fill(data.openPrice),
            borderColor: isPositive ? "green" : "crimson",
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
          tooltip: {
            callbacks: {
              title: function (context) {
                let timeLabel = context[0].label;
                return convertTo12HourFormat(timeLabel);
              },
              label: function (context) {
                let value = context.parsed.y;
                return `$${value.toFixed(2)}`;
              },
            },
            displayColors: false,
          },
        },
        scales: {
          x: { display: false },
          y: { display: false },
        },
      },
    });
    function convertTo12HourFormat(time) {
      const [hour, minute] = time.split(":").map(Number);
      const suffix = hour >= 12 ? "PM" : "AM";
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minute < 10 ? "0" : ""}${minute} ${suffix}`;
    }

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
