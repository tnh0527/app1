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

  const handleDateChange = (date) => {
    setHasChanges(true);
    if (date === null || isNaN(date.getTime())) {
      setErrors((prevErrors) => ({ ...prevErrors, birthdate: "Invalid date" }));
      return;
    }
    dispatch({ type: "SET_FIELD", field: "birthdate", value: date });
    setErrors((prevErrors) => ({ ...prevErrors, birthdate: "" }));
  };
  const handleRawDateChange = (e) => {
    setHasChanges(true);
    const { value } = e.target;
    const formattedValue = value
      .replace(/\D/g, "")
      .replace(/(\d{2})(\d)/, "$1/$2")
      .replace(/(\d{2})\/(\d{2})(\d)/, "$1/$2/$3")
      .substring(0, 10);
    e.target.value = formattedValue;
    dispatch({
      type: "SET_FIELD",
      field: "birthdate",
      value: formattedValue,
    });
  };

  const saveProfile = async (e) => {
    e.preventDefault();
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
    <div className="profile-content">
      <div className="profile-edit-container">
        <h3>Personal Information </h3>
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
              className={`form-control ${errors.username ? "is-invalid" : ""}`}
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
              selected={state.birthdate || null}
              onChange={handleDateChange}
              onKeyDown={(e) => {
                if (!/^[0-9/]$/.test(e.key) && e.key !== "Backspace") {
                  e.preventDefault();
                }
              }}
              onChangeRaw={handleRawDateChange}
              dateFormat="MM/dd/yyyy"
              className={`form-control ${errors.birthdate ? "is-invalid" : ""}`}
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
      <div className="profile-pic-page">
        <div className="profile-picture">
          <img src={profilePic} alt="Profile" className="profile-img" />
          <input
            className="upload-input"
            id="formFileSm"
            type="file"
            accept="image/*"
          />
          <button
            className="upload-button"
            onClick={() => setIsModalOpen(true)}
          >
            <i className="bi bi-image"></i>
          </button>
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
