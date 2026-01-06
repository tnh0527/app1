import {
  SkeletonElement,
  SkeletonChart,
} from "../../components/shared/LoadingStates";
import "./Financials.css";

/**
 * Financials Skeleton - Custom skeleton layout matching Financials dashboard
 */
export const FinancialsSkeleton = () => {
  return (
    <>
      {/* Header Skeleton */}
      <div className="financials-header skeleton-header">
        <div className="header-title">
          <SkeletonElement type="title" width="220px" height="28px" />
          <SkeletonElement type="text" width="180px" />
        </div>
        <div className="header-actions">
          <SkeletonElement
            type="badge"
            width="120px"
            height="40px"
            style={{ borderRadius: "10px" }}
          />
          <SkeletonElement
            type="badge"
            width="120px"
            height="40px"
            style={{ borderRadius: "10px" }}
          />
          <SkeletonElement
            type="badge"
            width="100px"
            height="40px"
            style={{ borderRadius: "10px" }}
          />
        </div>
      </div>

      {/* Hero Section Skeleton */}
      <div className="hero-section-skeleton">
        <div className="hero-skeleton-content">
          <div className="hero-skeleton-left">
            <SkeletonElement type="badge" width="100px" height="24px" />
            <SkeletonElement type="title" width="200px" height="56px" />
            <SkeletonElement type="subtitle" width="160px" />
          </div>
          <div className="hero-skeleton-right">
            <div className="hero-skeleton-stat">
              <SkeletonElement type="value" width="100px" height="32px" />
              <SkeletonElement type="label" width="60px" />
            </div>
            <div className="hero-skeleton-stat">
              <SkeletonElement type="value" width="100px" height="32px" />
              <SkeletonElement type="label" width="60px" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid Skeleton */}
      <div className="financials-grid">
        {/* Timeline Section */}
        <div className="grid-item timeline-section">
          <div className="panel-skeleton">
            <div className="panel-skeleton-header">
              <SkeletonElement type="title" width="180px" height="20px" />
              <div className="panel-skeleton-actions">
                <SkeletonElement type="badge" width="60px" height="28px" />
                <SkeletonElement type="badge" width="60px" height="28px" />
                <SkeletonElement type="badge" width="60px" height="28px" />
              </div>
            </div>
            <SkeletonChart height="280px" />
          </div>
        </div>

        {/* Breakdown Section */}
        <div className="grid-item breakdown-section">
          <div className="panel-skeleton">
            <SkeletonElement type="title" width="200px" height="20px" />
            <div className="breakdown-skeleton">
              <div className="breakdown-skeleton-chart">
                <SkeletonElement type="circle" width="180px" height="180px" />
              </div>
              <div className="breakdown-skeleton-legend">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="legend-skeleton-item">
                    <SkeletonElement type="circle" width="12px" height="12px" />
                    <SkeletonElement type="text" width="80px" />
                    <SkeletonElement type="text" width="60px" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Changes Section */}
        <div className="grid-item changes-section">
          <div className="panel-skeleton">
            <SkeletonElement type="title" width="140px" height="20px" />
            <div className="changes-skeleton-list">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="change-skeleton-item">
                  <SkeletonElement type="circle" width="36px" height="36px" />
                  <div className="change-skeleton-content">
                    <SkeletonElement type="text" width="120px" />
                    <SkeletonElement type="text" width="80px" />
                  </div>
                  <SkeletonElement type="text" width="60px" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Accounts Section */}
        <div className="grid-item accounts-section">
          <div className="panel-skeleton">
            <div className="panel-skeleton-header">
              <SkeletonElement type="title" width="120px" height="20px" />
              <SkeletonElement type="badge" width="100px" height="32px" />
            </div>
            <div className="accounts-skeleton-list">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="account-skeleton-item">
                  <div className="account-skeleton-left">
                    <SkeletonElement type="circle" width="40px" height="40px" />
                    <div className="account-skeleton-info">
                      <SkeletonElement type="text" width="100px" />
                      <SkeletonElement type="text" width="60px" />
                    </div>
                  </div>
                  <SkeletonElement type="text" width="80px" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Cash Flow Section */}
        <div className="grid-item cashflow-section">
          <div className="panel-skeleton">
            <SkeletonElement type="title" width="100px" height="20px" />
            <SkeletonChart height="180px" />
          </div>
        </div>

        {/* Milestones Section */}
        <div className="grid-item milestones-section">
          <div className="panel-skeleton">
            <SkeletonElement type="title" width="120px" height="20px" />
            <div className="milestones-skeleton-list">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="milestone-skeleton-item">
                  <SkeletonElement type="circle" width="32px" height="32px" />
                  <div className="milestone-skeleton-content">
                    <SkeletonElement type="text" width="140px" />
                    <SkeletonElement type="text" width="100px" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FinancialsSkeleton;
