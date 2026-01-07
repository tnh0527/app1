import "./Profile.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
  useState,
  useReducer,
  useEffect,
  useContext,
  useMemo,
  useRef,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { countryRegions } from "../../data/data";
import { SyncLoader } from "react-spinners";
import { ProfilePicModal } from "../../components/Modals";
import { ProfileContext } from "../../contexts/ProfileContext";
import api from "../../api/axios";
import CustomDropdown from "../Calendar/components/CustomDropdown";
import SettingsTab from "./SettingsTab";

// Field mappings for each tab
const TAB_FIELDS = {
  personal: [
    "first_name",
    "last_name",
    "username",
    "email",
    "phone_number",
    "birthdate",
    "bio",
  ],
  professional: ["career_title", "company", "website"],
  location: ["country", "state", "city", "zip_code", "street_address"],
  social: ["linkedin", "github", "instagram"],
};

// Input validation rules
const VALIDATION_RULES = {
  // Name fields - only letters, spaces, hyphens, apostrophes
  first_name: {
    pattern: /^[a-zA-Z\s\-']*$/,
    maxLength: 50,
    errorMsg: "Only letters, spaces, hyphens, and apostrophes allowed",
  },
  last_name: {
    pattern: /^[a-zA-Z\s\-']*$/,
    maxLength: 50,
    errorMsg: "Only letters, spaces, hyphens, and apostrophes allowed",
  },
  // Username - alphanumeric, underscores, periods
  username: {
    pattern: /^[a-zA-Z0-9_.]*$/,
    maxLength: 30,
    errorMsg: "Only letters, numbers, underscores, and periods allowed",
  },
  // Email - standard email validation
  email: {
    pattern: /^[a-zA-Z0-9._%+\-@]*$/,
    maxLength: 254,
    validate: (value) => {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return "Please enter a valid email address";
      }
      return null;
    },
  },
  // Phone - digits, spaces, dashes, parentheses, plus sign
  phone_number: {
    pattern: /^[0-9\s\-()+ ]*$/,
    maxLength: 20,
    errorMsg: "Only numbers and phone characters allowed",
  },
  // Bio - any characters but with length limit
  bio: {
    maxLength: 500,
  },
  // Career/Company - letters, numbers, spaces, common punctuation
  career_title: {
    pattern: /^[a-zA-Z0-9\s\-&.,/'()]*$/,
    maxLength: 100,
    errorMsg: "Only letters, numbers, and common punctuation allowed",
  },
  company: {
    pattern: /^[a-zA-Z0-9\s\-&.,/'()]*$/,
    maxLength: 100,
    errorMsg: "Only letters, numbers, and common punctuation allowed",
  },
  // URLs - allow URL characters
  website: {
    pattern: /^[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/,
    maxLength: 200,
    validate: (value) => {
      if (value && !/^https?:\/\/.+/.test(value)) {
        return "URL must start with http:// or https://";
      }
      return null;
    },
  },
  linkedin: {
    pattern: /^[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/,
    maxLength: 200,
    validate: (value) => {
      if (value && !value.includes("linkedin.com")) {
        return "Please enter a valid LinkedIn URL";
      }
      return null;
    },
  },
  github: {
    pattern: /^[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/,
    maxLength: 200,
    validate: (value) => {
      if (value && !value.includes("github.com")) {
        return "Please enter a valid GitHub URL";
      }
      return null;
    },
  },
  instagram: {
    pattern: /^[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]*$/,
    maxLength: 200,
    validate: (value) => {
      if (value && !value.includes("instagram.com")) {
        return "Please enter a valid Instagram URL";
      }
      return null;
    },
  },
  // City - only letters, spaces, hyphens, apostrophes
  city: {
    pattern: /^[a-zA-Z\s\-'.]*$/,
    maxLength: 100,
    errorMsg: "Only letters, spaces, hyphens, and apostrophes allowed",
  },
  // State - alphanumeric for flexibility
  state: {
    pattern: /^[a-zA-Z\s\-']*$/,
    maxLength: 100,
    errorMsg: "Only letters, spaces, and hyphens allowed",
  },
  // ZIP code - alphanumeric (supports US, Canada, UK formats)
  zip_code: {
    pattern: /^[a-zA-Z0-9\s-]*$/,
    maxLength: 20,
    errorMsg: "Only letters, numbers, spaces, and hyphens allowed",
  },
  // Street address - allow most characters
  street_address: {
    pattern: /^[a-zA-Z0-9\s\-.,#'/()]*$/,
    maxLength: 200,
    errorMsg: "Only letters, numbers, and address characters allowed",
  },
};

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
  const { section } = useParams();
  const navigate = useNavigate();

  const [state, dispatch] = useReducer(formReducer, initialState);
  const [initialProfile, setInitialProfile] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingTab, setSavingTab] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(section || "personal");

  // Valid tabs
  const validTabs = [
    "personal",
    "professional",
    "location",
    "social",
    "settings",
  ];

  // Refs to prevent infinite loops
  const isInitialMount = useRef(true);
  const isNavigatingRef = useRef(false);

  // Sync activeTab with URL parameter
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // On mount, validate and use section from URL
      if (section && validTabs.includes(section)) {
        setActiveTab(section);
      } else {
        // Invalid or no section, redirect to personal
        isNavigatingRef.current = true;
        navigate("/profile/personal", { replace: true });
        setActiveTab("personal");
      }
      return;
    }

    // Handle browser back/forward
    if (isNavigatingRef.current) {
      isNavigatingRef.current = false;
      return;
    }

    if (section && validTabs.includes(section) && section !== activeTab) {
      setActiveTab(section);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section]);

  // Sync URL when activeTab changes (user clicks tab)
  useEffect(() => {
    if (isInitialMount.current || !activeTab) return;

    if (activeTab !== section) {
      isNavigatingRef.current = true;
      navigate(`/profile/${activeTab}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Country options for CustomDropdown
  const countryOptions = [
    { value: "United States", label: "United States" },
    { value: "Canada", label: "Canada" },
    { value: "United Kingdom", label: "United Kingdom" },
    { value: "Australia", label: "Australia" },
    { value: "Germany", label: "Germany" },
    { value: "France", label: "France" },
    { value: "Japan", label: "Japan" },
    { value: "Other", label: "Other" },
  ];

  // Dynamic state/province options based on selected country
  const stateProvinceOptions = useMemo(() => {
    const regions = countryRegions[state.country];
    if (regions) {
      return [
        {
          value: "",
          label: `Select ${
            state.country === "United States" ? "State" : "Province"
          }`,
        },
        ...regions.map((r) => ({
          value: r.abbreviation,
          label: r.name,
        })),
      ];
    }
    return null; // No dropdown for countries without region data
  }, [state.country]);

  // Check if the current country has region data
  const hasRegionDropdown = useMemo(() => {
    return !!countryRegions[state.country];
  }, [state.country]);

  // Track changes per tab
  const tabHasChanges = useMemo(() => {
    const changes = {};
    Object.keys(TAB_FIELDS).forEach((tab) => {
      changes[tab] = TAB_FIELDS[tab].some((field) => {
        const currentVal = state[field];
        const initialVal = initialProfile[field];
        // Handle null/undefined/empty string comparisons
        if (
          currentVal === null ||
          currentVal === undefined ||
          currentVal === ""
        ) {
          return !(
            initialVal === null ||
            initialVal === undefined ||
            initialVal === ""
          );
        }
        if (
          initialVal === null ||
          initialVal === undefined ||
          initialVal === ""
        ) {
          return true;
        }
        // Handle date comparison
        if (field === "birthdate") {
          const currentDate =
            currentVal instanceof Date ? currentVal.toISOString() : currentVal;
          const initialDate =
            initialVal instanceof Date ? initialVal.toISOString() : initialVal;
          return currentDate !== initialDate;
        }
        return currentVal !== initialVal;
      });
    });
    return changes;
  }, [state, initialProfile]);

  useEffect(() => {
    if (profile) {
      dispatch({ type: "SET_PROFILE", payload: profile });
      setInitialProfile(profile);
    }
    setLoading(false);
  }, [profile]);

  // Validate input against rules
  const validateInput = (field, value) => {
    const rules = VALIDATION_RULES[field];
    if (!rules) return { valid: true, value };

    // Check pattern
    if (rules.pattern && !rules.pattern.test(value)) {
      return { valid: false, error: rules.errorMsg || "Invalid input" };
    }

    // Check max length
    if (rules.maxLength && value.length > rules.maxLength) {
      return { valid: false, error: `Maximum ${rules.maxLength} characters` };
    }

    // Run custom validation
    if (rules.validate) {
      const error = rules.validate(value);
      if (error) return { valid: false, error };
    }

    return { valid: true, value };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Validate the input
    const validation = validateInput(name, value);

    if (!validation.valid) {
      // Show error but don't update the field
      setErrors((prevErrors) => ({ ...prevErrors, [name]: validation.error }));
      return;
    }

    dispatch({ type: "SET_FIELD", field: name, value });
    setErrors((prevErrors) => ({ ...prevErrors, [name]: "" }));
  };

  // Handler for CustomDropdown components
  const handleDropdownChange = (field) => (value) => {
    dispatch({ type: "SET_FIELD", field, value });
    setErrors((prevErrors) => ({ ...prevErrors, [field]: "" }));

    // Reset state/province when country changes
    if (field === "country") {
      // Check if the new country has the current state value
      const newRegions = countryRegions[value];
      if (newRegions) {
        const hasCurrentState = newRegions.some(
          (r) => r.abbreviation === state.state
        );
        if (!hasCurrentState) {
          dispatch({ type: "SET_FIELD", field: "state", value: "" });
        }
      } else {
        // Country doesn't have regions dropdown, keep text value but clear if it was an abbreviation
        if (state.state && state.state.length <= 3) {
          dispatch({ type: "SET_FIELD", field: "state", value: "" });
        }
      }
    }
  };

  const handleRawDateChange = (e) => {
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

  // Validate all fields before save
  const validateBeforeSave = (fieldsToValidate) => {
    const newErrors = {};
    let hasErrors = false;

    fieldsToValidate.forEach((field) => {
      const value = state[field];
      if (value && typeof value === "string") {
        const rules = VALIDATION_RULES[field];
        if (rules?.validate) {
          const error = rules.validate(value);
          if (error) {
            newErrors[field] = error;
            hasErrors = true;
          }
        }
      }
    });

    if (hasErrors) {
      setErrors((prev) => ({ ...prev, ...newErrors }));
    }
    return !hasErrors;
  };

  const saveProfile = async (tabId = null) => {
    setSaving(true);
    setSavingTab(tabId);

    // Determine which fields to save
    const fieldsToSave = tabId
      ? TAB_FIELDS[tabId]
      : Object.values(TAB_FIELDS).flat();

    // Validate before saving
    if (!validateBeforeSave(fieldsToSave)) {
      setSaving(false);
      setSavingTab(null);
      return;
    }

    const updatedFields = {};
    fieldsToSave.forEach((field) => {
      const currentVal = state[field];
      const initialVal = initialProfile[field];

      // Compare values properly
      if (field === "birthdate") {
        const currentDate =
          currentVal instanceof Date ? currentVal.toISOString() : currentVal;
        const initialDate =
          initialVal instanceof Date ? initialVal.toISOString() : initialVal;
        if (currentDate !== initialDate) {
          updatedFields[field] = currentVal;
        }
      } else if (currentVal !== initialVal) {
        updatedFields[field] = currentVal;
      }
    });

    if (Object.keys(updatedFields).length === 0) {
      setSaving(false);
      setSavingTab(null);
      return;
    }

    try {
      const response = await api.put("/profile/edit-profile/", updatedFields, {
        validateStatus: (status) => status < 500,
      });

      if (response.status < 200 || response.status >= 300) {
        setErrors(response.data?.errors || {});
      } else {
        const updatedProfile = response.data;
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
      setSavingTab(null);
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

  // Compute age from birthdate (years)
  const computeAge = (birthdate) => {
    if (!birthdate) return null;
    const bd = birthdate instanceof Date ? birthdate : new Date(birthdate);
    if (isNaN(bd.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - bd.getFullYear();
    const m = today.getMonth() - bd.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  };

  // When switching tabs, discard unsaved changes in all other tabs
  const handleTabClick = (newTabId) => {
    // If clicking same tab, do nothing
    if (newTabId === activeTab) return;

    // Build payload resetting fields for tabs other than newTabId
    const resetPayload = {};
    Object.keys(TAB_FIELDS).forEach((tab) => {
      if (tab !== newTabId) {
        TAB_FIELDS[tab].forEach((field) => {
          // Use initialProfile value, falling back to initialState default
          resetPayload[field] =
            initialProfile && initialProfile[field] !== undefined
              ? initialProfile[field]
              : initialState[field];
        });
      }
    });

    // Apply reset and clear errors for those fields
    dispatch({ type: "SET_PROFILE", payload: resetPayload });
    const newErrors = { ...errors };
    Object.keys(resetPayload).forEach((f) => {
      if (newErrors[f]) delete newErrors[f];
    });
    setErrors(newErrors);

    // Navigate to new tab URL
    navigate(`/profile/${newTabId}`);
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
                  <span className="info-label">Age</span>
                  <span className="info-value">
                    {computeAge(state.birthdate) !== null
                      ? `${computeAge(state.birthdate)} years`
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
                onClick={() => handleTabClick(tab.id)}
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
                        maxLength={50}
                      />
                      {errors.first_name && (
                        <span className="field-error">{errors.first_name}</span>
                      )}
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
                        maxLength={50}
                      />
                      {errors.last_name && (
                        <span className="field-error">{errors.last_name}</span>
                      )}
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
                        maxLength={30}
                      />
                      {errors.username && (
                        <span className="field-error">{errors.username}</span>
                      )}
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
                        maxLength={254}
                      />
                      {errors.email && (
                        <span className="field-error">{errors.email}</span>
                      )}
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
                        maxLength={20}
                        className={errors.phone_number ? "error" : ""}
                      />
                      {errors.phone_number && (
                        <span className="field-error">
                          {errors.phone_number}
                        </span>
                      )}
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
                      {errors.birthdate && (
                        <span className="field-error">{errors.birthdate}</span>
                      )}
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
                  {tabHasChanges.personal && (
                    <div className="form-panel-actions">
                      <button
                        type="button"
                        className="panel-save-btn"
                        onClick={() => saveProfile("personal")}
                        disabled={saving}
                      >
                        {saving && savingTab === "personal" ? (
                          <SyncLoader loading={true} size={6} color="#fff" />
                        ) : (
                          <>
                            <i className="bi bi-cloud-arrow-up"></i>
                            <span>Save Changes</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
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
                        maxLength={100}
                        className={errors.career_title ? "error" : ""}
                      />
                      {errors.career_title && (
                        <span className="field-error">
                          {errors.career_title}
                        </span>
                      )}
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
                        maxLength={100}
                        className={errors.company ? "error" : ""}
                      />
                      {errors.company && (
                        <span className="field-error">{errors.company}</span>
                      )}
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
                        maxLength={200}
                        className={errors.website ? "error" : ""}
                      />
                      {errors.website && (
                        <span className="field-error">{errors.website}</span>
                      )}
                    </div>
                  </div>
                  {tabHasChanges.professional && (
                    <div className="form-panel-actions">
                      <button
                        type="button"
                        className="panel-save-btn"
                        onClick={() => saveProfile("professional")}
                        disabled={saving}
                      >
                        {saving && savingTab === "professional" ? (
                          <SyncLoader loading={true} size={6} color="#fff" />
                        ) : (
                          <>
                            <i className="bi bi-cloud-arrow-up"></i>
                            <span>Save Changes</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
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
                      <CustomDropdown
                        options={countryOptions}
                        value={state.country}
                        onChange={handleDropdownChange("country")}
                        placeholder="Select country"
                      />
                    </div>

                    <div className="form-field">
                      <label>
                        <i className="bi bi-map"></i>
                        {state.country === "United States"
                          ? "State"
                          : state.country === "Canada"
                          ? "Province"
                          : state.country === "Australia"
                          ? "State/Territory"
                          : "State / Province"}
                      </label>
                      {hasRegionDropdown ? (
                        <CustomDropdown
                          options={stateProvinceOptions}
                          value={state.state}
                          onChange={handleDropdownChange("state")}
                          placeholder={`Select ${
                            state.country === "United States"
                              ? "state"
                              : "province"
                          }`}
                        />
                      ) : (
                        <input
                          name="state"
                          type="text"
                          value={state.state}
                          onChange={handleChange}
                          placeholder="Enter state/province/region"
                          maxLength={100}
                          className={errors.state ? "error" : ""}
                        />
                      )}
                      {errors.state && (
                        <span className="field-error">{errors.state}</span>
                      )}
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
                        maxLength={100}
                        className={errors.city ? "error" : ""}
                      />
                      {errors.city && (
                        <span className="field-error">{errors.city}</span>
                      )}
                    </div>

                    <div className="form-field">
                      <label>
                        <i className="bi bi-mailbox"></i>
                        {state.country === "United States"
                          ? "ZIP Code"
                          : "Postal Code"}
                      </label>
                      <input
                        name="zip_code"
                        type="text"
                        value={state.zip_code}
                        onChange={handleChange}
                        placeholder={
                          state.country === "United States"
                            ? "10001"
                            : state.country === "Canada"
                            ? "A1A 1A1"
                            : state.country === "United Kingdom"
                            ? "SW1A 1AA"
                            : "Postal code"
                        }
                        maxLength={20}
                        className={errors.zip_code ? "error" : ""}
                      />
                      {errors.zip_code && (
                        <span className="field-error">{errors.zip_code}</span>
                      )}
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
                        maxLength={200}
                        className={errors.street_address ? "error" : ""}
                      />
                      {errors.street_address && (
                        <span className="field-error">
                          {errors.street_address}
                        </span>
                      )}
                    </div>
                  </div>
                  {tabHasChanges.location && (
                    <div className="form-panel-actions">
                      <button
                        type="button"
                        className="panel-save-btn"
                        onClick={() => saveProfile("location")}
                        disabled={saving}
                      >
                        {saving && savingTab === "location" ? (
                          <SyncLoader loading={true} size={6} color="#fff" />
                        ) : (
                          <>
                            <i className="bi bi-cloud-arrow-up"></i>
                            <span>Save Changes</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
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
                          maxLength={200}
                          className={errors.linkedin ? "error" : ""}
                        />
                        {errors.linkedin && (
                          <span className="field-error">{errors.linkedin}</span>
                        )}
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
                          maxLength={200}
                          className={errors.github ? "error" : ""}
                        />
                        {errors.github && (
                          <span className="field-error">{errors.github}</span>
                        )}
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
                          maxLength={200}
                          className={errors.instagram ? "error" : ""}
                        />
                        {errors.instagram && (
                          <span className="field-error">
                            {errors.instagram}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {tabHasChanges.social && (
                    <div className="form-panel-actions">
                      <button
                        type="button"
                        className="panel-save-btn"
                        onClick={() => saveProfile("social")}
                        disabled={saving}
                      >
                        {saving && savingTab === "social" ? (
                          <SyncLoader loading={true} size={6} color="#fff" />
                        ) : (
                          <>
                            <i className="bi bi-cloud-arrow-up"></i>
                            <span>Save Changes</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Settings Tab */}
              {activeTab === "settings" && <SettingsTab />}
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
