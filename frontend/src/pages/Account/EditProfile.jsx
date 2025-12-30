import "./EditProfile.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useState, useReducer, useEffect, useContext } from "react";
import { usStates } from "../../data/data";
import { SyncLoader } from "react-spinners";
import { ProfilePicModal } from "../../components/Modals";
import { ProfileContext } from "../../contexts/ProfileContext";
import { csrfToken } from "../../data/data";

const initialState = {
  first_name: "",
  last_name: "",
  username: "",
  email: "",
  career_title: "",
  company: "",
  bio: "",
  phone_number: "",
  website: "",
  linkedin: "",
  github: "",
  instagram: "",
  city: "",
  state: "",
  street_address: "",
  zip_code: "",
  country: "United States",
  birthdate: null,
  member_since: "",
};

const formReducer = (state, action) => {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    case "SET_PROFILE":
      return { ...state, ...action.payload };
    default:
      return state;
  }
};

const EditProfile = () => {
  const { profile, setProfile } = useContext(ProfileContext);
  const { profilePic, setProfilePic } = useContext(ProfileContext);

  const [state, dispatch] = useReducer(formReducer, initialState);
  const [initialProfile, setInitialProfile] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");

  useEffect(() => {
    if (profile) {
      dispatch({ type: "SET_PROFILE", payload: profile });
      setInitialProfile(profile);
    }
    setLoading(false);
  }, [profile]);

  const handleChange = (e) => {
    setHasChanges(true);
    const { name, value } = e.target;
    dispatch({ type: "SET_FIELD", field: name, value });
    setErrors((prevErrors) => ({ ...prevErrors, [name]: "" }));
  };

  const handleRawDateChange = (e) => {
    setHasChanges(true);
    const { value } = e.target;
    const formattedValue = value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "$1/$2")
      .replace(/(\d{2})\/(\d{2})(\d)/, "$1/$2/$3")
      .substring(0, 10);

    const isValidDateFormat =
      /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/.test(formattedValue);

    if (isValidDateFormat) {
      const parts = formattedValue.split("/");
      const month = parseInt(parts[0], 10);
      const day = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);
      const date = new Date(year, month - 1, day);
      if (
        !isNaN(date.getTime()) &&
        date.getDate() === day &&
        date.getMonth() === month - 1
      ) {
        dispatch({
          type: "SET_FIELD",
          field: "birthdate",
          value: date,
        });
        setErrors((prevErrors) => ({ ...prevErrors, birthdate: "" }));
      } else {
        setErrors((prevErrors) => ({
          ...prevErrors,
          birthdate: "Invalid date",
        }));
      }
    } else {
      setErrors((prevErrors) => ({
        ...prevErrors,
        birthdate: "Invalid date format",
      }));
    }
    e.target.value = formattedValue;
  };

  const saveProfile = async (e) => {
    e?.preventDefault();
    setSaving(true);
    const updatedFields = {};
    for (const key in state) {
      if (state[key] !== initialProfile[key]) {
        updatedFields[key] = state[key];
      }
    }
    if (Object.keys(updatedFields).length === 0) {
      setSaving(false);
      return;
    }
    try {
      const response = await fetch(
        "http://localhost:8000/profile/edit-profile/",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken,
          },
          credentials: "include",
          body: JSON.stringify(updatedFields),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        setErrors(errorData.errors || {});
      } else {
        const updatedProfile = await response.json();
        const birthdate = updatedProfile.birthdate
          ? new Date(
              new Date(updatedProfile.birthdate).getTime() +
                new Date(updatedProfile.birthdate).getTimezoneOffset() * 60000
            )
          : null;

        const normalizedProfile = { ...updatedProfile, birthdate };
        setProfile(normalizedProfile);
        dispatch({ type: "SET_PROFILE", payload: normalizedProfile });
        setInitialProfile(normalizedProfile);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setSaving(false);
      setHasChanges(false);
    }
  };

  const tabs = [
    { id: "personal", label: "Personal", icon: "bi-person" },
    { id: "professional", label: "Professional", icon: "bi-briefcase" },
    { id: "location", label: "Location", icon: "bi-geo-alt" },
    { id: "social", label: "Social", icon: "bi-link-45deg" },
  ];

  const getFullName = () => {
    const name = `${state.first_name} ${state.last_name}`.trim();
    return name || state.username || "User";
  };

  const getLocation = () => {
    const parts = [state.city, state.state, state.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "Location not set";
  };

  if (loading) {
    return (
      <div className="account-page">
        <div className="account-loading">
          <SyncLoader color="#00d4aa" size={12} />
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="account-page">
      {/* Animated Background Elements */}
      <div className="account-bg-effects">
        <div className="bg-orb bg-orb-1"></div>
        <div className="bg-orb bg-orb-2"></div>
        <div className="bg-orb bg-orb-3"></div>
        <div className="bg-grid"></div>
      </div>

      <div className="account-container">
        {/* Left Column - Profile Card */}
        <aside className="profile-sidebar">
          <div className="profile-card glass-card">
            {/* Avatar Section */}
            <div className="profile-avatar-wrapper">
              <div className="avatar-glow"></div>
              <div className="profile-avatar">
                <img src={profilePic} alt="Profile" />
                <button
                  className="avatar-edit-btn"
                  onClick={() => setIsModalOpen(true)}
                  aria-label="Change profile picture"
                >
                  <i className="bi bi-camera-fill"></i>
                </button>
              </div>
            </div>

            {/* Profile Info */}
            <div className="profile-info">
              <h2 className="profile-name">{getFullName()}</h2>
              {state.career_title && (
                <p className="profile-title">
                  {state.career_title}
                  {state.company && <span className="at-company"> @ {state.company}</span>}
                </p>
              )}
              {state.bio && <p className="profile-bio">{state.bio}</p>}
            </div>

            {/* Quick Stats */}
            <div className="profile-stats">
              <div className="stat-item">
                <i className="bi bi-geo-alt-fill"></i>
                <span>{getLocation()}</span>
              </div>
              <div className="stat-item">
                <i className="bi bi-envelope-fill"></i>
                <span>{state.email || "No email"}</span>
              </div>
              <div className="stat-item">
                <i className="bi bi-at"></i>
                <span>@{state.username}</span>
              </div>
              {state.phone_number && (
                <div className="stat-item">
                  <i className="bi bi-telephone-fill"></i>
                  <span>{state.phone_number}</span>
                </div>
              )}
              <div className="stat-item">
                <i className="bi bi-calendar-check-fill"></i>
                <span>Joined {state.member_since || "—"}</span>
              </div>
            </div>

            {/* Social Links */}
            {(state.linkedin || state.github || state.instagram || state.website) && (
              <div className="profile-social">
                {state.linkedin && (
                  <a href={state.linkedin} target="_blank" rel="noopener noreferrer" className="social-link linkedin">
                    <i className="bi bi-linkedin"></i>
                  </a>
                )}
                {state.github && (
                  <a href={state.github} target="_blank" rel="noopener noreferrer" className="social-link github">
                    <i className="bi bi-github"></i>
                  </a>
                )}
                {state.instagram && (
                  <a href={state.instagram} target="_blank" rel="noopener noreferrer" className="social-link instagram">
                    <i className="bi bi-instagram"></i>
                  </a>
                )}
                {state.website && (
                  <a href={state.website} target="_blank" rel="noopener noreferrer" className="social-link website">
                    <i className="bi bi-globe"></i>
                  </a>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Right Column - Edit Forms */}
        <main className="profile-main">
          {/* Header */}
          <div className="profile-header">
            <div className="header-content">
              <h1>Edit Profile</h1>
              <p>Update your personal information and settings</p>
            </div>
            <button
              className="save-btn"
              onClick={saveProfile}
              disabled={!hasChanges || saving}
            >
              {saving ? (
                <SyncLoader loading={saving} size={6} color="#fff" />
              ) : (
                <>
                  <i className="bi bi-check2"></i>
                  Save Changes
                </>
              )}
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="profile-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <i className={`bi ${tab.icon}`}></i>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Form Content */}
          <div className="profile-form-container glass-card">
            <form className="profile-form" onSubmit={saveProfile}>
              {/* Personal Tab */}
              {activeTab === "personal" && (
                <div className="form-section fade-in">
                  <div className="section-header">
                    <h3><i className="bi bi-person"></i> Personal Information</h3>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>First Name</label>
                      <input
                        name="first_name"
                        type="text"
                        value={state.first_name}
                        onChange={handleChange}
                        placeholder="Enter first name"
                        className={errors.first_name ? "is-invalid" : ""}
                      />
                    </div>

                    <div className="form-group">
                      <label>Last Name</label>
                      <input
                        name="last_name"
                        type="text"
                        value={state.last_name}
                        onChange={handleChange}
                        placeholder="Enter last name"
                        className={errors.last_name ? "is-invalid" : ""}
                      />
                    </div>

                    <div className="form-group">
                      <label>Username</label>
                      <div className="input-with-prefix">
                        <span className="prefix">@</span>
                        <input
                          name="username"
                          type="text"
                          value={state.username}
                          onChange={handleChange}
                          placeholder="username"
                          className={errors.username ? "is-invalid" : ""}
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Email</label>
                      <input
                        name="email"
                        type="email"
                        value={state.email}
                        onChange={handleChange}
                        placeholder="email@example.com"
                        className={errors.email ? "is-invalid" : ""}
                      />
                    </div>

                    <div className="form-group">
                      <label>Phone</label>
                      <input
                        name="phone_number"
                        type="tel"
                        value={state.phone_number}
                        onChange={handleChange}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>

                    <div className="form-group">
                      <label>Birthdate</label>
                      <DatePicker
                        selected={state.birthdate ? new Date(state.birthdate) : null}
                        onChangeRaw={handleRawDateChange}
                        dateFormat="MM/dd/yyyy"
                        placeholderText="MM/DD/YYYY"
                        open={false}
                        className={errors.birthdate ? "is-invalid" : ""}
                      />
                    </div>
                  </div>

                  <div className="form-group full-width">
                    <label>Bio</label>
                    <textarea
                      name="bio"
                      value={state.bio}
                      onChange={handleChange}
                      placeholder="Tell us about yourself..."
                      rows={3}
                      maxLength={500}
                    />
                    <span className="char-count">{state.bio?.length || 0}/500</span>
                  </div>
                </div>
              )}

              {/* Professional Tab */}
              {activeTab === "professional" && (
                <div className="form-section fade-in">
                  <div className="section-header">
                    <h3><i className="bi bi-briefcase"></i> Professional Information</h3>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Job Title</label>
                      <input
                        name="career_title"
                        type="text"
                        value={state.career_title}
                        onChange={handleChange}
                        placeholder="e.g., Software Engineer"
                      />
                    </div>

                    <div className="form-group">
                      <label>Company</label>
                      <input
                        name="company"
                        type="text"
                        value={state.company}
                        onChange={handleChange}
                        placeholder="e.g., Google"
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>Website</label>
                      <input
                        name="website"
                        type="url"
                        value={state.website}
                        onChange={handleChange}
                        placeholder="https://yourwebsite.com"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Location Tab */}
              {activeTab === "location" && (
                <div className="form-section fade-in">
                  <div className="section-header">
                    <h3><i className="bi bi-geo-alt"></i> Location</h3>
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Country</label>
                      <select
                        name="country"
                        value={state.country}
                        onChange={handleChange}
                      >
                        <option value="United States">United States</option>
                        <option value="Canada">Canada</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="Australia">Australia</option>
                        <option value="Germany">Germany</option>
                        <option value="France">France</option>
                        <option value="Japan">Japan</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>State / Province</label>
                      <select
                        name="state"
                        value={state.state}
                        onChange={handleChange}
                      >
                        <option value="">Select State</option>
                        {usStates.map((s) => (
                          <option key={s.abbreviation} value={s.abbreviation}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>City</label>
                      <input
                        name="city"
                        type="text"
                        value={state.city}
                        onChange={handleChange}
                        placeholder="Enter city"
                      />
                    </div>

                    <div className="form-group">
                      <label>ZIP Code</label>
                      <input
                        name="zip_code"
                        type="text"
                        value={state.zip_code}
                        onChange={handleChange}
                        placeholder="10001"
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>Street Address</label>
                      <input
                        name="street_address"
                        type="text"
                        value={state.street_address}
                        onChange={handleChange}
                        placeholder="123 Main St, Apt 4B"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Social Tab */}
              {activeTab === "social" && (
                <div className="form-section fade-in">
                  <div className="section-header">
                    <h3><i className="bi bi-link-45deg"></i> Social Links</h3>
                  </div>

                  <div className="social-grid">
                    <div className="social-input-group">
                      <div className="social-icon linkedin">
                        <i className="bi bi-linkedin"></i>
                      </div>
                      <div className="social-input-content">
                        <label>LinkedIn</label>
                        <input
                          name="linkedin"
                          type="url"
                          value={state.linkedin}
                          onChange={handleChange}
                          placeholder="https://linkedin.com/in/username"
                        />
                      </div>
                    </div>

                    <div className="social-input-group">
                      <div className="social-icon github">
                        <i className="bi bi-github"></i>
                      </div>
                      <div className="social-input-content">
                        <label>GitHub</label>
                        <input
                          name="github"
                          type="url"
                          value={state.github}
                          onChange={handleChange}
                          placeholder="https://github.com/username"
                        />
                      </div>
                    </div>

                    <div className="social-input-group">
                      <div className="social-icon instagram">
                        <i className="bi bi-instagram"></i>
                      </div>
                      <div className="social-input-content">
                        <label>Instagram</label>
                        <input
                          name="instagram"
                          type="url"
                          value={state.instagram}
                          onChange={handleChange}
                          placeholder="https://instagram.com/username"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        </main>
      </div>

      {/* Profile Picture Modal */}
      <ProfilePicModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpload={setProfilePic}
      />
    </div>
  );
};

export default EditProfile;
