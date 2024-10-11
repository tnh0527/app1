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

  const handleSave = () => {
    if (selectedImage) {
      onUpload(selectedImage);
      onClose();
    }
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
