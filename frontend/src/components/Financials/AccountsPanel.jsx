import { useState } from "react";
import "./AccountsPanel.css";

const formatCurrency = (value) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const getAccountIcon = (type, subtype) => {
  const icons = {
    cash: {
      checking: "bi-wallet2",
      savings: "bi-piggy-bank",
      emergency_fund: "bi-shield-check",
      default: "bi-cash-stack",
    },
    investment: {
      brokerage: "bi-graph-up",
      "401k": "bi-briefcase",
      ira: "bi-pie-chart",
      roth_ira: "bi-pie-chart-fill",
      hsa: "bi-heart-pulse",
      crypto: "bi-currency-bitcoin",
      default: "bi-bar-chart-line",
    },
    debt: {
      credit_card: "bi-credit-card",
      student_loan: "bi-mortarboard",
      mortgage: "bi-house",
      auto_loan: "bi-car-front",
      personal_loan: "bi-person",
      default: "bi-credit-card-2-back",
    },
    asset: {
      real_estate: "bi-building",
      vehicle: "bi-car-front-fill",
      jewelry: "bi-gem",
      collectibles: "bi-collection",
      default: "bi-box-seam",
    },
  };

  return icons[type]?.[subtype] || icons[type]?.default || "bi-wallet";
};

const AccountCard = ({ account }) => {
  return (
    <div className="account-card" style={{ "--accent-color": account.color }}>
      <div className="acc-icon">
        <i
          className={`bi ${getAccountIcon(account.type, account.subtype)}`}
        ></i>
      </div>
      <div className="acc-info">
        <span className="acc-name">{account.name}</span>
        <span className="acc-institution">
          {account.institution || "Manual"}
        </span>
      </div>
      <div className="acc-value-container">
        <span
          className={`acc-value ${
            account.type === "debt" ? "negative" : "positive"
          }`}
        >
          {account.type === "debt" ? "-" : ""}
          {formatCurrency(Math.abs(account.value))}
        </span>
        {account.last_updated && (
          <span className="acc-updated">
            Updated {new Date(account.last_updated).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
};

// eslint-disable-next-line no-unused-vars
export const AccountsPanel = ({ accounts, onRefresh }) => {
  const [activeTab, setActiveTab] = useState("all");

  const allAccounts = [
    ...(accounts?.cash || []),
    ...(accounts?.investment || []),
    ...(accounts?.asset || []),
    ...(accounts?.debt || []),
  ];

  const filteredAccounts =
    activeTab === "all" ? allAccounts : accounts?.[activeTab] || [];

  const tabs = [
    { id: "all", label: "All", count: allAccounts.length },
    { id: "cash", label: "Cash", count: accounts?.cash?.length || 0 },
    {
      id: "investment",
      label: "Investments",
      count: accounts?.investment?.length || 0,
    },
    { id: "asset", label: "Assets", count: accounts?.asset?.length || 0 },
    { id: "debt", label: "Debt", count: accounts?.debt?.length || 0 },
  ];

  // Calculate totals for each category
  const categoryTotals = {
    cash: accounts?.cash?.reduce((sum, a) => sum + a.value, 0) || 0,
    investment: accounts?.investment?.reduce((sum, a) => sum + a.value, 0) || 0,
    asset: accounts?.asset?.reduce((sum, a) => sum + a.value, 0) || 0,
    debt: accounts?.debt?.reduce((sum, a) => sum + a.value, 0) || 0,
  };

  return (
    <div className="accounts-panel">
      <div className="panel-header">
        <div className="panel-title">
          <i className="bi bi-wallet2"></i>
          <span>Accounts</span>
        </div>
        <span className="accounts-count">{allAccounts.length} accounts</span>
      </div>

      {/* Category Summary */}
      <div className="category-summary">
        {tabs.slice(1).map((tab) => (
          <div
            key={tab.id}
            className={`category-stat ${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="cat-label">{tab.label}</span>
            <span
              className={`cat-total ${tab.id === "debt" ? "negative" : ""}`}
            >
              {tab.id === "debt" && categoryTotals[tab.id] > 0 && "-"}
              {formatCurrency(Math.abs(categoryTotals[tab.id]))}
            </span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="accounts-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            <span className="tab-count">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Accounts List */}
      <div className="accounts-list">
        {filteredAccounts.length > 0 ? (
          filteredAccounts.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))
        ) : (
          <div className="no-accounts">
            <i className="bi bi-inbox"></i>
            <p>No accounts in this category</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountsPanel;
