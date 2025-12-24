import React, { useEffect, useState, useRef } from "react";
import Chart from "chart.js/auto";
import MainCharts from "../../components/Insight/MainCharts";
import "./Insight.css";
import Ticker from "../../components/Insight/Tickers";

const Insight = () => {
  const [timeRange, setTimeRange] = useState("1D");
  const [stockIndex, setStockIndex] = useState(0);
  const [chartType, setChartType] = useState("line");
  const [stocks, setStocks] = useState([]);
  const [stockGraphs, setStockGraphs] = useState([]);

  return (
    <div className="insight-dashboard">
      <Ticker />
      <div className="feature-grid">
        <div className="feature-1">
          <h3>Feature 1</h3>
          <p>Feature 1 content goes here.</p>
        </div>
        <div className="feature-2">
          <h3>Feature 2</h3>
          <p>Feature 2 content goes here.</p>
        </div>
      </div>
      <div className="stock-watchlist">
        <h3>Stock Watchlist</h3>
        <div className="chart-container">
          <div className="chart-options">
            {["1D", "5D", "1M", "6M", "1Y"].map((range) => (
              <button
                key={range}
                className={`chart-option-button ${
                  timeRange === range ? "active" : ""
                }`}
                onClick={() => setTimeRange(range)}
              >
                {range}
              </button>
            ))}
            <button
              className={`chart-option-button ${
                chartType === "line" ? "active" : ""
              }`}
              onClick={() => setChartType("line")}
            >
              Line Chart
            </button>
            <button
              className={`chart-option-button ${
                chartType === "candle" ? "active" : ""
              }`}
              onClick={() => setChartType("candle")}
            >
              Candle Stick Chart
            </button>
          </div>
          <MainCharts timeRange={timeRange} chartType={chartType} />
        </div>
      </div>
      <div className="details">
        <div className="details-card">
          <h3>Details</h3>
          <ul>
            <li>
              <span>????</span>
              <span>$4,566.48</span>
            </li>
            <li>
              <span>Previous Close</span>
              <span>$4,558.48</span>
            </li>
            <li>
              <span>Open Price</span>
              <span>$4,560.00</span>
            </li>
          </ul>
        </div>
        <div className="details-card">
          <h3>Feature 3</h3>
          <ul>
            <li>
              <span>???</span>
              <span>???????</span>
            </li>
            <li>
              <span>???</span>
              <span>???????</span>
            </li>
          </ul>
        </div>
        <div className="details-card">
          <h3>Market Info</h3>
          <ul>
            <li>
              <span>Market Cap</span>
              <span>???</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

const SparklineGraph = ({ data, isPositive }) => {
  const canvasRef = useRef(null);
  let chartInstance = useRef(null);

  useEffect(() => {
    if (canvasRef.current && data && data.labels && data.values) {
      const ctx = canvasRef.current.getContext("2d");

      // Destroy the previous chart instance if it exists
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }

      // Define the border color based on whether the change is positive or negative
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
          labels: data.labels,
          datasets: [
            {
              data: data.values,
              borderColor: borderColor,
              backgroundColor: gradient,
              fill: true, // Enable fill for the area under the line
              tension: 0.6, // Increase the tension further for a smoother line
              pointRadius: 0, // Increase the tension for a smoother line
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
          },
          scales: {
            x: {
              display: false,
            },
            y: {
              display: false,
            },
          },
        },
      });
    }
  }, [data, isPositive]);

  return (
    <canvas
      ref={canvasRef}
      className="sparkline-canvas"
      style={{ width: "100%", height: "auto" }}
    />
  );
};

export default Insight;
