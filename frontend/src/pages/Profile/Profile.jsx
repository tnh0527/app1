import "./Profile.css";
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

const Profile = () => {
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
    { id: "settings", label: "Settings", icon: "bi-gear" },
  ];

  const getFullName = () => {
    const name = `${state.first_name} ${state.last_name}`.trim();
    return name || state.username || "User";
  };

  const getLocation = () => {
    const parts = [state.city, state.state, state.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "Location not set";
  };

  const getInitials = () => {
    const first = state.first_name?.charAt(0) || "";
    const last = state.last_name?.charAt(0) || "";
    return (
      (first + last).toUpperCase() ||
      state.username?.charAt(0)?.toUpperCase() ||
      "U"
    );
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          <div className="loading-ring">
            <div className="loading-ring-inner"></div>
          </div>
          <p>Initializing profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Top Spacer */}
      <div className="profile-top-spacer"></div>

      {/* Main Content */}
      <div className="profile-layout">
        {/* Profile Card - Left */}
        <aside className="profile-showcase">
          <div className="showcase-card">
            {/* Profile Visual */}
            <div className="showcase-visual">
              <div className="avatar-container">
                <div className="avatar-ring">
                  <svg viewBox="0 0 100 100">
                    <circle className="ring-track" cx="50" cy="50" r="46" />
                    <circle className="ring-progress" cx="50" cy="50" r="46" />
                  </svg>
                </div>
                <div className="avatar-image">
                  {profilePic ? (
                    <img src={profilePic} alt="Profile" />
                  ) : (
                    <span className="avatar-initials">{getInitials()}</span>
                  )}
                </div>
                <button
                  className="avatar-edit"
                  onClick={() => setIsModalOpen(true)}
                  title="Change photo"
                >
                  <i className="bi bi-camera"></i>
                </button>
              </div>
              <div className="avatar-status online"></div>
            </div>

            {/* Profile Identity */}
            <div className="showcase-identity">
              <h2 className="identity-name">{getFullName()}</h2>
              <p className="identity-handle">@{state.username || "username"}</p>
              {state.career_title && (
                <div className="identity-role">
                  <i className="bi bi-briefcase"></i>
                  <span>{state.career_title}</span>
                  {state.company && (
                    <>
                      <span className="role-divider">•</span>
                      <span className="role-company">{state.company}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Bio Section */}
            {state.bio && (
              <div className="showcase-bio">
                <p>{state.bio}</p>
              </div>
            )}

            {/* Quick Info */}
            <div className="showcase-info">
              <div className="info-item">
                <div className="info-icon">
                  <i className="bi bi-geo-alt"></i>
                </div>
                <div className="info-content">
                  <span className="info-label">Location</span>
                  <span className="info-value">{getLocation()}</span>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon">
                  <i className="bi bi-envelope"></i>
                </div>
                <div className="info-content">
                  <span className="info-label">Email</span>
                  <span className="info-value">{state.email || "Not set"}</span>
                </div>
              </div>
              <div className="info-item">
                <div className="info-icon">
                  <i className="bi bi-calendar-event"></i>
                </div>
                <div className="info-content">
                  <span className="info-label">Birthdate</span>
                  <span className="info-value">
                    {state.birthdate
                      ? new Date(state.birthdate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "—"}
                  </span>
                </div>
              </div>
            </div>

            {/* Social Links */}
            {(state.linkedin ||
              state.github ||
              state.instagram ||
              state.website) && (
              <div className="showcase-social">
                {state.linkedin && (
                  <a
                    href={state.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-btn linkedin"
                    title="LinkedIn"
                  >
                    <i className="bi bi-linkedin"></i>
                  </a>
                )}
                {state.github && (
                  <a
                    href={state.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-btn github"
                    title="GitHub"
                  >
                    <i className="bi bi-github"></i>
                  </a>
                )}
                {state.instagram && (
                  <a
                    href={state.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-btn instagram"
                    title="Instagram"
                  >
                    <i className="bi bi-instagram"></i>
                  </a>
                )}
                {state.website && (
                  <a
                    href={state.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-btn website"
                    title="Website"
                  >
                    <i className="bi bi-globe2"></i>
                  </a>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Edit Form - Right */}
        <main className="profile-editor">
          {/* Tab Navigation */}
          <nav className="editor-nav">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`nav-tab ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <i className={`bi ${tab.icon}`}></i>
                <span className="tab-label">{tab.label}</span>
                {activeTab === tab.id && (
                  <span className="tab-indicator"></span>
                )}
              </button>
            ))}
          </nav>

          {/* Form Panels */}
          <div className="editor-content">
            <form onSubmit={saveProfile}>
              {/* Personal Tab */}
              {activeTab === "personal" && (
                <div className="form-panel animate-in">
                  <div className="panel-header">
                    <div className="panel-icon">
                      <i className="bi bi-person-badge"></i>
                    </div>
                    <div className="panel-title">
                      <h3>Personal Information</h3>
                      <p>Your basic identity details</p>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-field">
                      <label>
                        <i className="bi bi-type"></i>
                        First Name
                      </label>
                      <input
                        name="first_name"
                        type="text"
                        value={state.first_name}
                        onChange={handleChange}
                        placeholder="Enter your first name"
                        className={errors.first_name ? "error" : ""}
                      />
                    </div>

                    <div className="form-field">
                      <label>
                        <i className="bi bi-type"></i>
                        Last Name
                      </label>
                      <input
                        name="last_name"
                        type="text"
                        value={state.last_name}
                        onChange={handleChange}
                        placeholder="Enter your last name"
                        className={errors.last_name ? "error" : ""}
                      />
                    </div>

                    <div className="form-field">
                      <label>
                        <i className="bi bi-at"></i>
                        Username
                      </label>
                      <input
                        name="username"
                        type="text"
                        value={state.username}
                        onChange={handleChange}
                        placeholder="username"
                        className={errors.username ? "error" : ""}
                      />
                    </div>

                    <div className="form-field">
                      <label>
                        <i className="bi bi-envelope"></i>
                        Email Address
                      </label>
                      <input
                        name="email"
                        type="email"
                        value={state.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        className={errors.email ? "error" : ""}
                      />
                    </div>

                    <div className="form-field">
                      <label>
                        <i className="bi bi-phone"></i>
                        Phone Number
                      </label>
                      <input
                        name="phone_number"
                        type="tel"
                        value={state.phone_number}
                        onChange={handleChange}
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>

                    <div className="form-field">
                      <label>
                        <i className="bi bi-cake2"></i>
                        Birthdate
                      </label>
                      <DatePicker
                        selected={
                          state.birthdate ? new Date(state.birthdate) : null
                        }
                        onChangeRaw={handleRawDateChange}
                        dateFormat="MM/dd/yyyy"
                        placeholderText="MM/DD/YYYY"
                        open={false}
                        className={errors.birthdate ? "error" : ""}
                      />
                    </div>

                    <div className="form-field span-full">
                      <label>
                        <i className="bi bi-chat-quote"></i>
                        Bio
                      </label>
                      <textarea
                        name="bio"
                        value={state.bio}
                        onChange={handleChange}
                        placeholder="Write a short bio about yourself..."
                        rows={4}
                        maxLength={500}
                      />
                      <span className="char-counter">
                        {state.bio?.length || 0} / 500
                      </span>
                    </div>
                  </div>
                  <div className="form-panel-actions">
                    <button
                      type="button"
                      className="panel-save-btn"
                      onClick={saveProfile}
                      disabled={!hasChanges || saving}
                    >
                      {saving ? (
                        <SyncLoader loading={saving} size={6} color="#fff" />
                      ) : (
                        <>
                          <i className="bi bi-cloud-arrow-up"></i>
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Professional Tab */}
              {activeTab === "professional" && (
                <div className="form-panel animate-in">
                  <div className="panel-header">
                    <div className="panel-icon career">
                      <i className="bi bi-rocket-takeoff"></i>
                    </div>
                    <div className="panel-title">
                      <h3>Career Information</h3>
                      <p>Your professional details</p>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-field">
                      <label>
                        <i className="bi bi-briefcase"></i>
                        Job Title
                      </label>
                      <input
                        name="career_title"
                        type="text"
                        value={state.career_title}
                        onChange={handleChange}
                        placeholder="e.g., Software Engineer"
                      />
                    </div>

                    <div className="form-field">
                      <label>
                        <i className="bi bi-building"></i>
                        Company
                      </label>
                      <input
                        name="company"
                        type="text"
                        value={state.company}
                        onChange={handleChange}
                        placeholder="e.g., Google"
                      />
                    </div>

                    <div className="form-field span-full">
                      <label>
                        <i className="bi bi-link-45deg"></i>
                        Website
                      </label>
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
                <div className="form-panel animate-in">
                  <div className="panel-header">
                    <div className="panel-icon location">
                      <i className="bi bi-globe-americas"></i>
                    </div>
                    <div className="panel-title">
                      <h3>Location Details</h3>
                      <p>Where are you based?</p>
                    </div>
                  </div>

                  <div className="form-grid">
                    <div className="form-field">
                      <label>
                        <i className="bi bi-flag"></i>
                        Country
                      </label>
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

                    <div className="form-field">
                      <label>
                        <i className="bi bi-map"></i>
                        State / Province
                      </label>
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

                    <div className="form-field">
                      <label>
                        <i className="bi bi-geo"></i>
                        City
                      </label>
                      <input
                        name="city"
                        type="text"
                        value={state.city}
                        onChange={handleChange}
                        placeholder="Enter city"
                      />
                    </div>

                    <div className="form-field">
                      <label>
                        <i className="bi bi-mailbox"></i>
                        ZIP Code
                      </label>
                      <input
                        name="zip_code"
                        type="text"
                        value={state.zip_code}
                        onChange={handleChange}
                        placeholder="10001"
                      />
                    </div>

                    <div className="form-field span-full">
                      <label>
                        <i className="bi bi-signpost-2"></i>
                        Street Address
                      </label>
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
                <div className="form-panel animate-in">
                  <div className="panel-header">
                    <div className="panel-icon social">
                      <i className="bi bi-share"></i>
                    </div>
                    <div className="panel-title">
                      <h3>Social Profiles</h3>
                      <p>Connect your social accounts</p>
                    </div>
                  </div>

                  <div className="social-links-grid">
                    <div className="social-link-card">
                      <div className="social-link-icon linkedin">
                        <i className="bi bi-linkedin"></i>
                      </div>
                      <div className="social-link-input">
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

                    <div className="social-link-card">
                      <div className="social-link-icon github">
                        <i className="bi bi-github"></i>
                      </div>
                      <div className="social-link-input">
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

                    <div className="social-link-card">
                      <div className="social-link-icon instagram">
                        <i className="bi bi-instagram"></i>
                      </div>
                      <div className="social-link-input">
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

export default Profile;
