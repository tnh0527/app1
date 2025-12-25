import { useEffect, useState } from "react";
import SparklineGraph from "./SparklineGraph";

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
                <span className="stock-card__name">{stock.name}</span>
                <div className="stocks-header">
                  <h3>
                    <span className="stock-card__symbol">
                      {stock.symbol}
                      <i
                        className={`bi bi-caret-${
                          stock.positive ? "up" : "down"
                        }-fill ${
                          stock.positive
                            ? "insight-change--up"
                            : "insight-change--down"
                        }`}
                      ></i>
                    </span>
                  </h3>
                  <p
                    className={
                      stock.positive
                        ? "total-return insight-change--up"
                        : "total-return insight-change--down"
                    }
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
                  <p className="stock-card__label">Price:</p>
                  <p className="stock-card__price">{stock.value}</p>
                </div>
                <div className="return-info">
                  <p className="stock-card__label">Total Return:</p>
                  <p
                    className={
                      stock.positive
                        ? "total-return insight-change--up"
                        : "total-return insight-change--down"
                    }
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

export default Tickers;
