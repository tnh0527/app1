import "./ProfilePicModal.css";
import { useState } from "react";

const ProfilePicModal = ({ isOpen, onClose, onUpload }) => {
  const [selectedImage, setSelectedImage] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (selectedImage) {
      try {
        const formData = new FormData();
        formData.append("file", selectedImage);
        const response = await fetch(
          "http://localhost:5001/profile/profile-pic",
          {
            method: "PUT",
            credentials: "include",
            body: formData,
          }
        );
        if (response.ok) {
          onUpload(selectedImage);
          console.log("Profile picture updated.");
        } else {
          const errorData = await response.json();
          console.error("Error updating profile picture:", errorData.error);
        }
      } catch (error) {
        console.error("Failed to update profile picture:", error);
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Upload Profile Picture</h3>
        <input type="file" accept="image/*" onChange={handleFileChange} />
        {selectedImage && (
          <div className="preview-container">
            <img src={selectedImage} alt="Selected" className="image-preview" />
          </div>
        )}
        <div className="modal-buttons">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="save-button"
            onClick={handleSave}
            disabled={!selectedImage}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePicModal;
