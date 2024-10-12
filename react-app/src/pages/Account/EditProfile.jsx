import "./EditProfile.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useState, useReducer, useEffect } from "react";
import { usStates } from "../../data/data";
import { SyncLoader } from "react-spinners";
import ProfilePicModal from "../../components/Modals/Profile/ProfilePicModal";

const initialState = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  city: "",
  state: "",
  birthday: null,
};

const formReducer = (state, action) => {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value };
    default:
      return state;
  }
};

const EditProfile = ({ profilePic, setProfilePic }) => {
  const [state, dispatch] = useReducer(formReducer, initialState);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    dispatch({ type: "SET_FIELD", field: name, value });
    setErrors((prevErrors) => ({ ...prevErrors, [name]: "" }));
  };

  const handleDateChange = (date) => {
    dispatch({ type: "SET_FIELD", field: "birthday", value: date });
    setErrors((prevErrors) => ({ ...prevErrors, birthdate: "" }));
  };

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "http://localhost:5001/user/profile/edit-profile",
        {
          method: "GET",
        }
      );

      if (response.ok) {
        const profile = await response.json();
        dispatch({
          type: "SET_PROFILE",
          payload: {
            firstName: profile.firstName,
            lastName: profile.lastName,
            username: profile.username,
            email: profile.email,
            city: profile.city,
            state: profile.state,
            birthday: new Date(profile.birthday),
          },
        });
      } else {
        console.error("Failed to fetch profile.");
      }
    } catch (error) {
      console.error("Caught an error:", error.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchProfile();
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch(
        "http://localhost:5001/user/profile/edit-profile",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firstName: state.firstName,
            lastName: state.lastName,
            username: state.username,
            email: state.email,
            city: state.city,
            state: state.state,
            birthdate: state.birthday,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        setErrors(errorData.errors || "");
        console.error("Failed to update profile.");
      } else {
        console.log("Successfully updated profile.");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setLoading(false);
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
                id="firstName"
                name="firstName"
                type="text"
                value={state.firstName}
                onChange={handleChange}
                onKeyDown={(e) => {
                  if (!/^[a-zA-Z]$/.test(e.key) && e.key !== "Backspace") {
                    e.preventDefault();
                  }
                }}
                className={`form-control ${
                  errors.firstName ? "is-invalid" : ""
                }`}
              />
              <div className="invalid-feedback">{errors.firstName}</div>
            </div>

            <div className="form-group">
              <label>Last Name</label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={state.lastName}
                onChange={handleChange}
                onKeyDown={(e) => {
                  if (!/^[a-zA-Z]$/.test(e.key) && e.key !== "Backspace") {
                    e.preventDefault();
                  }
                }}
                className={`form-control ${
                  errors.lastName ? "is-invalid" : ""
                }`}
              />
              <div className="invalid-feedback">{errors.lastName}</div>
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
            <label>Birthday</label>
            <DatePicker
              id="birthday"
              selected={state.birthday}
              onChange={handleDateChange}
              dateFormat="MM/dd/yyyy"
              className={`form-control ${errors.birthdate ? "is-invalid" : ""}`}
            />
            <div className="invalid-feedback">{errors.birthdate}</div>
          </div>

          <div className="button-container">
            <button type="submit" className="button profile-button">
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
