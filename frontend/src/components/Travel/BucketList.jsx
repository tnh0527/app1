import { useState } from "react";
import "./BucketList.css";
import { goalsApi } from "../../api/travelApi";

export const BucketList = ({ goals, goalStats, onRefresh }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGoal, setNewGoal] = useState({
    destination: "",
    country: "",
    country_code: "",
    priority: 5,
  });

  const pendingGoals = goals.filter((g) => !g.is_achieved);
  const achievedGoals = goals.filter((g) => g.is_achieved);

  const handleAddGoal = async (e) => {
    e.preventDefault();
    try {
      await goalsApi.create(newGoal);
      setNewGoal({ destination: "", country: "", country_code: "", priority: 5 });
      setShowAddForm(false);
      onRefresh();
    } catch (err) {
      console.error("Failed to add goal:", err);
    }
  };

  const handleMarkAchieved = async (goalId) => {
    try {
      await goalsApi.markAchieved(goalId);
      onRefresh();
    } catch (err) {
      console.error("Failed to mark goal as achieved:", err);
    }
  };

  const getPriorityStars = (priority) => {
    const filled = Math.min(priority, 5);
    return "★".repeat(filled) + "☆".repeat(5 - filled);
  };

  return (
    <div className="bucket-list">
      <div className="panel-header">
        <h3 className="panel-title">
          <i className="bi bi-heart"></i>
          Travel Bucket List
        </h3>
        <div className="header-stats">
          <span className="stat">
            {goalStats?.achieved || 0} achieved
          </span>
          <button
            className="add-goal-btn"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <i className="bi bi-plus"></i>
          </button>
        </div>
      </div>

      <div className="panel-content">
        {/* Add Goal Form */}
        {showAddForm && (
          <form className="add-goal-form" onSubmit={handleAddGoal}>
            <div className="form-row">
              <input
                type="text"
                placeholder="Destination"
                value={newGoal.destination}
                onChange={(e) =>
                  setNewGoal({ ...newGoal, destination: e.target.value })
                }
                required
              />
              <input
                type="text"
                placeholder="Country"
                value={newGoal.country}
                onChange={(e) =>
                  setNewGoal({ ...newGoal, country: e.target.value })
                }
                required
              />
              <input
                type="text"
                placeholder="Code (US)"
                value={newGoal.country_code}
                onChange={(e) =>
                  setNewGoal({
                    ...newGoal,
                    country_code: e.target.value.toUpperCase().slice(0, 2),
                  })
                }
                maxLength={2}
                required
              />
            </div>
            <div className="form-row">
              <label className="priority-label">
                Priority: {newGoal.priority}
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={newGoal.priority}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, priority: parseInt(e.target.value) })
                  }
                />
              </label>
              <button type="submit" className="submit-btn">
                Add Goal
              </button>
            </div>
          </form>
        )}

        {/* Goals List */}
        <div className="goals-list">
          {pendingGoals.length === 0 && achievedGoals.length === 0 ? (
            <div className="empty-goals">
              <i className="bi bi-geo-alt"></i>
              <p>No travel goals yet</p>
              <span>Add destinations to your bucket list!</span>
            </div>
          ) : (
            <>
              {pendingGoals.map((goal) => (
                <div key={goal.id} className="goal-item">
                  <div className="goal-flag">{goal.country_flag}</div>
                  <div className="goal-info">
                    <h4>{goal.destination}</h4>
                    <p>{goal.country}</p>
                  </div>
                  <div className="goal-priority">
                    <span className="priority-stars">
                      {getPriorityStars(goal.priority)}
                    </span>
                  </div>
                  <button
                    className="achieve-btn"
                    onClick={() => handleMarkAchieved(goal.id)}
                    title="Mark as achieved"
                  >
                    <i className="bi bi-check-lg"></i>
                  </button>
                </div>
              ))}

              {achievedGoals.length > 0 && (
                <>
                  <div className="achieved-header">
                    <span>Achieved ({achievedGoals.length})</span>
                  </div>
                  {achievedGoals.slice(0, 3).map((goal) => (
                    <div key={goal.id} className="goal-item achieved">
                      <div className="goal-flag">{goal.country_flag}</div>
                      <div className="goal-info">
                        <h4>{goal.destination}</h4>
                        <p>{goal.country}</p>
                      </div>
                      <div className="achieved-badge">
                        <i className="bi bi-check-circle-fill"></i>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BucketList;

