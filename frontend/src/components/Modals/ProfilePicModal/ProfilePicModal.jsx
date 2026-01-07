import "./ProfilePicModal.css";
import { useState } from "react";
import api from "../../../api/axios";

const ProfilePicModal = ({ isOpen, onClose, onUpload }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result);
      };
      setSelectedFile(file);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (selectedFile) {
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const response = await api.put("/profile/profile-pic/", formData, {
          // Let Axios set the multipart boundary; don't force Content-Type.
          headers: {},
          validateStatus: (status) => status < 500,
        });

        if (response.status >= 200 && response.status < 300) {
          onUpload(selectedImage);
          window.location.reload();
        } else {
          let errorMessage = "Failed to update profile picture.";
          try {
            const errorData = response.data;
            errorMessage =
              errorData?.error || errorData?.detail || errorMessage;
          } catch {
            // ignore
          }
          console.error("Error updating profile picture:", errorMessage);
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
