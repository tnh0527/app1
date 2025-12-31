import "./Home.css";

const WidgetSkeleton = ({ minHeight = "220px" }) => (
  <div className="home-widget" style={{ minHeight }}>
    <div className="widget-header">
      <div className="widget-title-section">
        <div
          className="skeleton"
          style={{ width: "40px", height: "40px", borderRadius: "12px" }}
        ></div>
        <div>
          <div
            className="skeleton"
            style={{
              width: "100px",
              height: "18px",
              marginBottom: "4px",
              borderRadius: "4px",
            }}
          ></div>
          <div
            className="skeleton"
            style={{ width: "80px", height: "14px", borderRadius: "4px" }}
          ></div>
        </div>
      </div>
    </div>
    <div className="widget-content">
      <div className="widget-loading"></div>
    </div>
  </div>
);

const DashboardSkeleton = () => {
  return (
    <div className="home-page">
      <div className="home-bg-effects">
        <div className="bg-orb bg-orb-1"></div>
        <div className="bg-orb bg-orb-2"></div>
        <div className="bg-orb bg-orb-3"></div>
        <div className="bg-grid"></div>
      </div>

      {/* Header Skeleton */}
      <header className="home-header">
        <div className="header-content">
          <div className="greeting-section">
            <div
              className="skeleton"
              style={{
                width: "280px",
                height: "38px",
                marginBottom: "8px",
                borderRadius: "8px",
              }}
            ></div>
            <div
              className="skeleton"
              style={{ width: "200px", height: "20px", borderRadius: "6px" }}
            ></div>
          </div>
        </div>
      </header>

      {/* Dashboard Grid Skeleton */}
      <main className="home-dashboard-grid">
        {/* Top Row: Financials (left, spans 2 rows) | Weather (right, spans 2 rows) */}
        <WidgetSkeleton minHeight="260px" />
        <WidgetSkeleton minHeight="260px" />

        {/* Middle Row: Calendar (left) | Travel (right) */}
        <WidgetSkeleton minHeight="230px" />
        <WidgetSkeleton minHeight="220px" />

        {/* Bottom Row: Empty widget (left) | Subscriptions (right) */}
        <WidgetSkeleton minHeight="220px" />
        <WidgetSkeleton minHeight="220px" />
      </main>
    </div>
  );
};

export { DashboardSkeleton as HomeSkeleton };
export default DashboardSkeleton;
