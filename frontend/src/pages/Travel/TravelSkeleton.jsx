import {
  SkeletonElement,
  SkeletonChart,
} from "../../components/shared/LoadingStates";
import "./Travel.css";

/**
 * Travel Skeleton - Custom skeleton layout matching Travel dashboard
 */
export const TravelSkeleton = () => {
  return (
    <div className="travel-page">
      {/* Header Skeleton */}
      <div className="travel-header skeleton-header">
        <div className="header-title">
          <SkeletonElement type="title" width="200px" height="28px" />
          <SkeletonElement type="text" width="260px" />
        </div>
        <div className="header-actions">
          <div className="view-toggle-skeleton">
            <SkeletonElement type="badge" width="100px" height="36px" />
            <SkeletonElement type="badge" width="100px" height="36px" />
          </div>
          <SkeletonElement type="badge" width="130px" height="40px" style={{ borderRadius: "10px" }} />
        </div>
      </div>

      {/* Hero Section Skeleton */}
      <div className="travel-hero-skeleton">
        <div className="hero-skeleton-content">
          <div className="hero-skeleton-main">
            <SkeletonElement type="badge" width="100px" height="24px" />
            <SkeletonElement type="title" width="240px" height="48px" />
            <SkeletonElement type="subtitle" width="180px" />
            <div className="hero-skeleton-countdown">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="countdown-item-skeleton">
                  <SkeletonElement type="value" width="40px" height="36px" />
                  <SkeletonElement type="label" width="30px" />
                </div>
              ))}
            </div>
          </div>
          <div className="hero-skeleton-side">
            <SkeletonElement type="image" width="200px" height="120px" />
          </div>
        </div>
      </div>

      {/* Main Grid Skeleton */}
      <div className="travel-grid">
        {/* Timeline Section */}
        <div className="grid-item timeline-section">
          <div className="panel-skeleton">
            <div className="panel-skeleton-header">
              <SkeletonElement type="title" width="140px" height="20px" />
              <div className="panel-skeleton-actions">
                <SkeletonElement type="badge" width="60px" height="28px" />
                <SkeletonElement type="badge" width="60px" height="28px" />
              </div>
            </div>
            <div className="timeline-skeleton-items">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="timeline-card-skeleton">
                  <SkeletonElement type="image" width="100%" height="80px" />
                  <div className="timeline-card-content-skeleton">
                    <SkeletonElement type="text" width="80%" />
                    <SkeletonElement type="text" width="60%" />
                    <div className="timeline-card-footer-skeleton">
                      <SkeletonElement type="badge" width="50px" height="20px" />
                      <SkeletonElement type="text" width="60px" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upcoming Section */}
        <div className="grid-item upcoming-section">
          <div className="panel-skeleton">
            <SkeletonElement type="title" width="140px" height="20px" />
            <div className="upcoming-list-skeleton">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="upcoming-item-skeleton">
                  <SkeletonElement type="circle" width="40px" height="40px" />
                  <div className="upcoming-item-content-skeleton">
                    <SkeletonElement type="text" width="100px" />
                    <SkeletonElement type="text" width="70px" />
                  </div>
                  <SkeletonElement type="badge" width="50px" height="24px" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Budget Section */}
        <div className="grid-item budget-section">
          <div className="panel-skeleton">
            <SkeletonElement type="title" width="140px" height="20px" />
            <SkeletonChart height="180px" />
            <div className="budget-breakdown-skeleton">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="budget-item-skeleton">
                  <SkeletonElement type="circle" width="12px" height="12px" />
                  <SkeletonElement type="text" width="60px" />
                  <SkeletonElement type="text" width="50px" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tools Section */}
        <div className="grid-item tools-section">
          <div className="panel-skeleton">
            <SkeletonElement type="title" width="120px" height="20px" />
            <div className="tools-tabs-skeleton">
              {[...Array(4)].map((_, i) => (
                <SkeletonElement key={i} type="badge" width="70px" height="28px" />
              ))}
            </div>
            <div className="tools-content-skeleton">
              <SkeletonElement type="text" width="100%" height="40px" />
              <SkeletonElement type="text" width="100%" height="40px" />
              <SkeletonElement type="badge" width="100px" height="36px" />
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid-item stats-section">
          <div className="panel-skeleton">
            <SkeletonElement type="title" width="120px" height="20px" />
            <div className="stats-grid-skeleton">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="stat-item-skeleton">
                  <SkeletonElement type="circle" width="32px" height="32px" />
                  <SkeletonElement type="value" width="60px" height="28px" />
                  <SkeletonElement type="label" width="50px" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bucket List Section */}
        <div className="grid-item bucketlist-section">
          <div className="panel-skeleton">
            <div className="panel-skeleton-header">
              <SkeletonElement type="title" width="120px" height="20px" />
              <SkeletonElement type="badge" width="80px" height="32px" />
            </div>
            <div className="bucketlist-grid-skeleton">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="goal-card-skeleton">
                  <SkeletonElement type="circle" width="40px" height="40px" />
                  <div className="goal-content-skeleton">
                    <SkeletonElement type="text" width="100px" />
                    <SkeletonElement type="text" width="70px" />
                  </div>
                  <SkeletonElement type="badge" width="40px" height="20px" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TravelSkeleton;

