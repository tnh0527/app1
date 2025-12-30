import { useState } from "react";
import "./QuickTools.css";
import { exchangeApi } from "../../api/travelApi";

const CurrencyConverter = () => {
  const [amount, setAmount] = useState("");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("EUR");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const currencies = [
    "USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "INR", "MXN",
    "BRL", "KRW", "SGD", "THB", "VND", "PHP", "IDR", "MYR", "NZD", "SEK",
  ];

  const handleConvert = async () => {
    if (!amount) return;
    setLoading(true);
    try {
      const data = await exchangeApi.convert(parseFloat(amount), fromCurrency, toCurrency);
      setResult(data);
    } catch (err) {
      console.error("Conversion failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setResult(null);
  };

  return (
    <div className="tool-content currency-converter">
      <div className="converter-input">
        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <select value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value)}>
          {currencies.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div className="converter-controls">
        <button className="swap-btn" onClick={handleSwap}>
          <i className="bi bi-arrow-down-up"></i>
        </button>
      </div>

      <div className="converter-input">
        <input
          type="text"
          readOnly
          value={result ? result.converted_amount.toFixed(2) : ""}
          placeholder="Result"
        />
        <select value={toCurrency} onChange={(e) => setToCurrency(e.target.value)}>
          {currencies.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <button
        className="convert-btn"
        onClick={handleConvert}
        disabled={loading || !amount}
      >
        {loading ? "Converting..." : "Convert"}
      </button>

      {result && (
        <div className="rate-info">
          <span>Rate: 1 {fromCurrency} = {result.rate.toFixed(4)} {toCurrency}</span>
        </div>
      )}
    </div>
  );
};

const TimezoneConverter = () => {
  const [time, setTime] = useState("12:00");
  const [fromTz, setFromTz] = useState("America/New_York");
  const [toTz, setToTz] = useState("Europe/London");
  const [result, setResult] = useState(null);

  const timezones = [
    { value: "America/New_York", label: "New York (EST)" },
    { value: "America/Los_Angeles", label: "Los Angeles (PST)" },
    { value: "America/Chicago", label: "Chicago (CST)" },
    { value: "Europe/London", label: "London (GMT)" },
    { value: "Europe/Paris", label: "Paris (CET)" },
    { value: "Europe/Berlin", label: "Berlin (CET)" },
    { value: "Asia/Tokyo", label: "Tokyo (JST)" },
    { value: "Asia/Shanghai", label: "Shanghai (CST)" },
    { value: "Asia/Singapore", label: "Singapore (SGT)" },
    { value: "Asia/Dubai", label: "Dubai (GST)" },
    { value: "Australia/Sydney", label: "Sydney (AEST)" },
    { value: "Pacific/Auckland", label: "Auckland (NZST)" },
  ];

  const handleConvert = () => {
    const [hours, minutes] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);

    const fromTime = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: fromTz,
    });

    const toTime = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: toTz,
    });

    setResult({ from: fromTime, to: toTime });
  };

  return (
    <div className="tool-content timezone-converter">
      <div className="tz-input">
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
        <select value={fromTz} onChange={(e) => setFromTz(e.target.value)}>
          {timezones.map((tz) => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
      </div>

      <div className="tz-arrow">
        <i className="bi bi-arrow-down"></i>
      </div>

      <div className="tz-input">
        <input
          type="text"
          readOnly
          value={result ? result.to : ""}
          placeholder="Converted time"
        />
        <select value={toTz} onChange={(e) => setToTz(e.target.value)}>
          {timezones.map((tz) => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
      </div>

      <button className="convert-btn" onClick={handleConvert}>
        Convert
      </button>
    </div>
  );
};

const TripCalculator = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [result, setResult] = useState(null);

  const handleCalculate = () => {
    if (!startDate || !endDate) return;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const diffWeeks = Math.floor(diffDays / 7);
    const remainingDays = diffDays % 7;

    setResult({
      days: diffDays,
      weeks: diffWeeks,
      remainingDays,
    });
  };

  return (
    <div className="tool-content trip-calculator">
      <div className="date-input">
        <label>Start Date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
      </div>

      <div className="date-input">
        <label>End Date</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>

      <button className="convert-btn" onClick={handleCalculate}>
        Calculate
      </button>

      {result && (
        <div className="calc-result">
          <div className="result-item">
            <span className="result-value">{result.days}</span>
            <span className="result-label">Days</span>
          </div>
          {result.weeks > 0 && (
            <div className="result-text">
              ({result.weeks} week{result.weeks > 1 ? "s" : ""}
              {result.remainingDays > 0 && ` + ${result.remainingDays} day${result.remainingDays > 1 ? "s" : ""}`})
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const QuickTools = () => {
  const [activeTab, setActiveTab] = useState("currency");

  const tabs = [
    { id: "currency", label: "Currency", icon: "bi-currency-exchange" },
    { id: "timezone", label: "Timezone", icon: "bi-clock" },
    { id: "calculator", label: "Duration", icon: "bi-calendar-range" },
  ];

  return (
    <div className="quick-tools">
      <div className="panel-header">
        <h3 className="panel-title">
          <i className="bi bi-tools"></i>
          Quick Tools
        </h3>
      </div>

      <div className="panel-content">
        <div className="tools-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tool-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <i className={`bi ${tab.icon}`}></i>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="tool-panel">
          {activeTab === "currency" && <CurrencyConverter />}
          {activeTab === "timezone" && <TimezoneConverter />}
          {activeTab === "calculator" && <TripCalculator />}
        </div>
      </div>
    </div>
  );
};

export default QuickTools;

