import React, { useState } from "react";
import { Line, Chart as ChartJS } from "react-chartjs-2";
import {
  Chart as ChartJSCore,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  registerables,
} from "chart.js";
import {
  CandlestickController,
  CandlestickElement,
} from "chartjs-chart-financial";
import "chartjs-chart-financial";

// Register the necessary components with Chart.js
ChartJSCore.register(
  ...registerables,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  CandlestickController,
  CandlestickElement
);

const MainCharts = ({ timeRange, chartType }) => {
  // Dummy data for charts
  const dataOptions = {
    "1D": [4520, 4530, 4540, 4525, 4550],
    "5D": [4500, 4520, 4560, 4570, 4580],
    "1M": [4400, 4500, 4550, 4600, 4650],
    "6M": [4300, 4400, 4500, 4600, 4700],
    "1Y": [4200, 4300, 4400, 4550, 4566],
  };

  const candleDataOptions = {
    "1D": [
      { x: "2023-11-01", o: 4520, h: 4550, l: 4510, c: 4530 },
      { x: "2023-11-02", o: 4530, h: 4560, l: 4520, c: 4540 },
      { x: "2023-11-03", o: 4540, h: 4570, l: 4530, c: 4525 },
      { x: "2023-11-04", o: 4525, h: 4560, l: 4500, c: 4550 },
      { x: "2023-11-05", o: 4550, h: 4600, l: 4540, c: 4550 },
    ],
    "5D": [
      { x: "2023-10-30", o: 4500, h: 4525, l: 4490, c: 4515 },
      { x: "2023-10-31", o: 4515, h: 4550, l: 4505, c: 4530 },
      { x: "2023-11-01", o: 4530, h: 4560, l: 4520, c: 4540 },
      { x: "2023-11-02", o: 4540, h: 4570, l: 4530, c: 4555 },
      { x: "2023-11-03", o: 4555, h: 4600, l: 4540, c: 4580 },
    ],
    "1M": [
      { x: "2023-10-01", o: 4400, h: 4450, l: 4380, c: 4440 },
      { x: "2023-10-10", o: 4440, h: 4500, l: 4420, c: 4480 },
      { x: "2023-10-20", o: 4480, h: 4550, l: 4460, c: 4520 },
      { x: "2023-10-30", o: 4520, h: 4600, l: 4500, c: 4590 },
      { x: "2023-11-01", o: 4590, h: 4650, l: 4570, c: 4630 },
    ],
    "6M": [
      { x: "2023-05-01", o: 4300, h: 4350, l: 4280, c: 4340 },
      { x: "2023-06-01", o: 4340, h: 4400, l: 4320, c: 4380 },
      { x: "2023-07-01", o: 4380, h: 4500, l: 4360, c: 4450 },
      { x: "2023-08-01", o: 4450, h: 4600, l: 4430, c: 4580 },
      { x: "2023-09-01", o: 4580, h: 4700, l: 4560, c: 4670 },
    ],
    "1Y": [
      { x: "2022-11-01", o: 4200, h: 4250, l: 4180, c: 4230 },
      { x: "2023-02-01", o: 4230, h: 4300, l: 4210, c: 4280 },
      { x: "2023-05-01", o: 4280, h: 4400, l: 4260, c: 4380 },
      { x: "2023-08-01", o: 4380, h: 4550, l: 4360, c: 4500 },
      { x: "2023-11-01", o: 4500, h: 4566, l: 4480, c: 4550 },
    ],
  };

  const lineChartData = {
    labels: ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
    datasets: [
      {
        label: "S&P 500",
        data: dataOptions[timeRange],
        borderColor: "rgba(75,192,192,1)",
        fill: false,
        tension: 0.1,
      },
    ],
  };

  const candleChartData = {
    datasets: [
      {
        label: "S&P 500",
        data: candleDataOptions[timeRange],
        color: {
          up: "#4caf50",
          down: "#f44336",
          unchanged: "#999",
        },
      },
    ],
  };

  const lineChartOptions = {
    maintainAspectRatio: false,
    scales: {
      x: {
        type: "category",
        title: {
          display: true,
          text: "Time Points",
        },
      },
      y: {
        title: {
          display: true,
          text: "Value",
        },
      },
    },
  };

  const candleChartOptions = {
    maintainAspectRatio: false,
    scales: {
      x: {
        type: "category",
        title: {
          display: true,
          text: "Time Points",
        },
      },
      y: {
        type: "linear",
        title: {
          display: true,
          text: "Value",
        },
        min: 4100, // Adjusted range to fit real data
        max: 4700, // Adjusted range to fit real data
      },
    },
    plugins: {
      legend: {
        display: true,
        position: "top",
      },
    },
  };

  return (
    <div className="chart-wrapper">
      {chartType === "line" ? (
        <Line data={lineChartData} options={lineChartOptions} />
      ) : (
        <ChartJS
          type="candlestick"
          data={candleChartData}
          options={candleChartOptions}
        />
      )}
    </div>
  );
};

export default MainCharts;
