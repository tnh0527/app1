import {
  SkeletonElement,
  SkeletonChart,
} from "../../components/shared/LoadingStates";
import "./Subscriptions.css";

/**
 * Subscriptions Skeleton - Custom skeleton layout matching Subscriptions dashboard
 */
export const SubscriptionsSkeleton = () => {
  return (
    <div className="subscriptions-page">
      {/* Header Skeleton */}
      <div className="subscriptions-header skeleton-header">
        <div className="header-title">
          <SkeletonElement type="title" width="180px" height="28px" />
          <SkeletonElement type="text" width="200px" />
        </div>
        <div className="header-actions">
          <SkeletonElement type="badge" width="140px" height="40px" style={{ borderRadius: "10px" }} />
          <SkeletonElement type="badge" width="100px" height="40px" style={{ borderRadius: "10px" }} />
        </div>
      </div>

      {/* Hero Section Skeleton */}
      <div className="subscription-hero-skeleton">
        <div className="hero-cards-skeleton">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="hero-card-skeleton">
              <div className="hero-card-skeleton-header">
                <SkeletonElement type="circle" width="40px" height="40px" />
                <SkeletonElement type="text" width="80px" />
              </div>
              <SkeletonElement type="title" width="100px" height="32px" />
              <SkeletonElement type="text" width="60px" />
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid Skeleton */}
      <div className="subscriptions-grid">
        {/* Spending Chart */}
        <div className="grid-item spending-section">
          <div className="panel-skeleton">
            <div className="panel-skeleton-header">
              <SkeletonElement type="title" width="160px" height="20px" />
              <div className="panel-skeleton-actions">
                <SkeletonElement type="badge" width="60px" height="28px" />
                <SkeletonElement type="badge" width="60px" height="28px" />
              </div>
            </div>
            <SkeletonChart height="250px" />
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="grid-item category-section">
          <div className="panel-skeleton">
            <SkeletonElement type="title" width="180px" height="20px" />
            <div className="category-skeleton">
              <SkeletonElement type="circle" width="160px" height="160px" />
              <div className="category-legend-skeleton">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="category-legend-item-skeleton">
                    <SkeletonElement type="circle" width="12px" height="12px" />
                    <SkeletonElement type="text" width="80px" />
                    <SkeletonElement type="text" width="50px" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Charges */}
        <div className="grid-item upcoming-section">
          <div className="panel-skeleton">
            <SkeletonElement type="title" width="160px" height="20px" />
            <div className="upcoming-list-skeleton">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="upcoming-item-skeleton">
                  <SkeletonElement type="circle" width="36px" height="36px" />
                  <div className="upcoming-item-content-skeleton">
                    <SkeletonElement type="text" width="100px" />
                    <SkeletonElement type="text" width="70px" />
                  </div>
                  <SkeletonElement type="text" width="60px" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Subscription List */}
        <div className="grid-item subscriptions-list-section">
          <div className="panel-skeleton">
            <div className="panel-skeleton-header">
              <SkeletonElement type="title" width="160px" height="20px" />
              <div className="panel-skeleton-actions">
                {[...Array(5)].map((_, i) => (
                  <SkeletonElement key={i} type="badge" width="50px" height="28px" />
                ))}
              </div>
            </div>
            <div className="subscriptions-list-skeleton">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="subscription-card-skeleton">
                  <div className="subscription-card-header-skeleton">
                    <SkeletonElement type="circle" width="48px" height="48px" />
                    <div className="subscription-card-info-skeleton">
                      <SkeletonElement type="text" width="120px" />
                      <SkeletonElement type="text" width="80px" />
                    </div>
                  </div>
                  <div className="subscription-card-footer-skeleton">
                    <SkeletonElement type="text" width="70px" height="24px" />
                    <SkeletonElement type="badge" width="50px" height="20px" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionsSkeleton;

