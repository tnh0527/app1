import "./EditProfile.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useState, useReducer, useEffect, useContext } from "react";
import { usStates } from "../../data/data";
import { SyncLoader } from "react-spinners";
import ProfilePicModal from "../../components/Modals/Profile/ProfilePicModal";
import { ProfileContext } from "../../utils/ProfileContext";
import { csrfToken } from "../../data/data";

const initialState = {
  first_name: "",
  last_name: "",
  username: "",
  email: "",
  city: "",
  state: "",
  birthdate: null,
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedChanges, setSavedChanges] = useState(false);

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
    setLoading(true);
    const updatedFields = {};
    for (const key in state) {
      if (state[key] !== initialProfile[key]) {
        updatedFields[key] = state[key];
      }
    }
    if (Object.keys(updatedFields).length === 0) {
      console.log("No changes detected.");
      setLoading(false);
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
        console.error("Failed to update profile.");
      } else {
        setInitialProfile({ ...initialProfile, ...updatedFields });
        console.log("Successfully updated profile.");
        setSavedChanges(!savedChanges);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setLoading(false);
      setHasChanges(false);
    }
  };

  return (
    <div className="account-page">
      <div className="account-header">
        <div>
          <h1 className="account-title">My Account</h1>
          <p className="account-subtitle">Update your profile information</p>
        </div>
      </div>

      <div className="account-grid">
        <div className="account-card account-card--avatar">
          <div className="account-avatar">
            <img src={profilePic} alt="Profile" className="profile-img" />
            <input
              className="upload-input"
              id="formFileSm"
              type="file"
              accept="image/*"
            />
            <button
              type="button"
              className="upload-button"
              onClick={() => setIsModalOpen(true)}
              aria-label="Change profile picture"
            >
              <i className="bi bi-image"></i>
            </button>
          </div>

          <div className="account-avatar-meta">
            <div className="account-meta-row">
              <span className="account-meta-label">Username</span>
              <span className="account-meta-value">
                {state.username || "—"}
              </span>
            </div>
            <div className="account-meta-row">
              <span className="account-meta-label">Email</span>
              <span className="account-meta-value">{state.email || "—"}</span>
            </div>
          </div>
        </div>

        <div className="account-card account-card--form">
          <div className="account-card-header">
            <h3>Personal Information</h3>
            <p>Fields are saved when you click Save.</p>
          </div>

          <form className="profile-form" onSubmit={saveProfile}>
            <div className="form-group-row">
              <div className="form-group">
                <label>First Name</label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  value={state.first_name}
                  onChange={handleChange}
                  onKeyDown={(e) => {
                    if (!/^[a-zA-Z]$/.test(e.key) && e.key !== "Backspace") {
                      e.preventDefault();
                    }
                  }}
                  className={`form-control ${
                    errors.first_name ? "is-invalid" : ""
                  }`}
                />
                <div className="invalid-feedback">{errors.first_name}</div>
              </div>

              <div className="form-group">
                <label>Last Name</label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={state.last_name}
                  onChange={handleChange}
                  onKeyDown={(e) => {
                    if (!/^[a-zA-Z]$/.test(e.key) && e.key !== "Backspace") {
                      e.preventDefault();
                    }
                  }}
                  className={`form-control ${
                    errors.last_name ? "is-invalid" : ""
                  }`}
                />
                <div className="invalid-feedback">{errors.last_name}</div>
              </div>
            </div>

            <div className="form-group">
              <label>Username</label>
              <input
                id="username"
                name="username"
                type="text"
                value={state.username}
                onChange={handleChange}
                className={`form-control ${
                  errors.username ? "is-invalid" : ""
                }`}
              />
              <div className="invalid-feedback">{errors.username}</div>
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                id="email"
                name="email"
                type="text"
                value={state.email}
                onChange={handleChange}
                className={`form-control ${errors.email ? "is-invalid" : ""}`}
              />
              <div className="invalid-feedback">{errors.email}</div>
            </div>

            <div className="form-group-row">
              <div className="form-group">
                <label>State</label>
                <select
                  id="state"
                  name="state"
                  value={state.state}
                  onChange={handleChange}
                  className={`form-control ${errors.state ? "is-invalid" : ""}`}
                >
                  <option disabled value=""></option>
                  {usStates.map((state) => (
                    <option key={state.abbreviation} value={state.abbreviation}>
                      {state.name}
                    </option>
                  ))}
                </select>
                <div className="invalid-feedback">{errors.state}</div>
              </div>

              <div className="form-group">
                <label>City</label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  value={state.city}
                  onKeyDown={(e) => {
                    if (!/^[a-zA-Z]$/.test(e.key) && e.key !== "Backspace") {
                      e.preventDefault();
                    }
                  }}
                  onChange={handleChange}
                  className={`form-control ${errors.city ? "is-invalid" : ""}`}
                />
                <div className="invalid-feedback">{errors.city}</div>
              </div>
            </div>

            <div className="form-group">
              <label>Birthdate</label>
              <DatePicker
                id="birthdate"
                selected={state.birthdate ? new Date(state.birthdate) : null}
                onChangeRaw={handleRawDateChange}
                onFocus={(e) => {
                  setErrors((prevErrors) => ({ ...prevErrors, birthdate: "" }));
                }}
                dateFormat="MM/dd/yyyy"
                open={false}
                className={`form-control ${
                  errors.birthdate ? "is-invalid" : ""
                }`}
              />
              <div className="invalid-feedback">{errors.birthdate}</div>
            </div>

            <div className="button-container">
              <button
                type="submit"
                className="button profile-button"
                disabled={!hasChanges}
              >
                {loading ? (
                  <SyncLoader loading={loading} size={10} color={"#22D6D6"} />
                ) : (
                  "Save"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      <ProfilePicModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUpload={setProfilePic}
      />
    </div>
  );
};

export default EditProfile;
