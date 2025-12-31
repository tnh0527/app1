import { useState } from "react";
import { milestonesApi } from "../../api/financialsApi";
import "./MilestonesPanel.css";

const formatCurrency = (value) => {
  if (Math.abs(value) >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
};

export const MilestonesPanel = ({ milestones = [], onRefresh }) => {
  const [celebrating, setCelebrating] = useState(null);

  const handleCelebrate = async (milestoneId) => {
    try {
      setCelebrating(milestoneId);
      await milestonesApi.celebrate(milestoneId);
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error("Failed to celebrate milestone:", error);
    } finally {
      setCelebrating(null);
    }
  };

  // Separate achieved and in-progress milestones
  const achievedMilestones = milestones.filter((m) => m.is_achieved);
  const inProgressMilestones = milestones.filter((m) => !m.is_achieved);

  return (
    <div className="milestones-panel">
      <div className="panel-header">
        <div className="panel-title">
          <i className="bi bi-trophy"></i>
          <span>Milestones</span>
        </div>
        <span className="milestone-stats">
          {achievedMilestones.length}/{milestones.length}
        </span>
      </div>

      <div className="milestones-content">
        {/* In Progress */}
        {inProgressMilestones.length > 0 && (
          <div className="milestone-section">
            <h4 className="section-label">In Progress</h4>
            {inProgressMilestones.slice(0, 3).map((milestone) => (
              <div key={milestone.id} className="milestone-item in-progress">
                <div className="ms-header">
                  <span className="ms-name">{milestone.name}</span>
                  <span className="ms-target">
                    {formatCurrency(milestone.target_amount)}
                  </span>
                </div>
                <div className="ms-progress-bar">
                  <div
                    className="ms-progress-fill"
                    style={{
                      width: `${Math.min(100, milestone.progress)}%`,
                      backgroundColor: milestone.color || "#208585",
                    }}
                  ></div>
                </div>
                <div className="ms-stats">
                  <span className="ms-current">
                    {formatCurrency(milestone.current_value)}
                  </span>
                  <span className="ms-percent">
                    {milestone.progress.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Achieved */}
        {achievedMilestones.length > 0 && (
          <div className="milestone-section achieved">
            <h4 className="section-label">
              <i className="bi bi-check-circle-fill"></i>
              Achieved
            </h4>
            {achievedMilestones.slice(0, 3).map((milestone) => (
              <div key={milestone.id} className="milestone-item achieved">
                <div className="ms-header">
                  <span className="ms-name">
                    <i className="bi bi-check-circle-fill"></i>
                    {milestone.name}
                  </span>
                  <span className="ms-target achieved">
                    {formatCurrency(milestone.target_amount)}
                  </span>
                </div>
                <div className="ms-achieved-info">
                  <span className="ms-date">
                    Achieved on{" "}
                    {new Date(milestone.achieved_at).toLocaleDateString()}
                  </span>
                  {!milestone.is_celebrated && (
                    <button
                      className="celebrate-btn"
                      onClick={() => handleCelebrate(milestone.id)}
                      disabled={celebrating === milestone.id}
                    >
                      {celebrating === milestone.id ? (
                        <i className="bi bi-hourglass-split"></i>
                      ) : (
                        <>
                          <i className="bi bi-stars"></i>
                          Celebrate!
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {milestones.length === 0 && (
          <div className="no-milestones">
            <i className="bi bi-flag"></i>
            <p>No milestones set</p>
            <span>Set financial goals to track your progress</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MilestonesPanel;
