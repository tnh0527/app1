import "./DeleteConfirmModal.css";

const DeleteConfirmModal = ({ isOpen, eventTitle, onConfirm, onCancel }) => {
  if (!isOpen) return null;

  return (
    <div className="delete-modal-overlay" onClick={onCancel}>
      <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-header">
          <div className="delete-modal-icon">
            <i className="bi bi-exclamation-triangle"></i>
          </div>
          <h3 className="delete-modal-title">Delete Event?</h3>
        </div>

        <div className="delete-modal-body">
          <p className="delete-modal-message">
            Are you sure you want to delete{" "}
            <strong>&quot;{eventTitle || "this event"}&quot;</strong>?
          </p>
          <p className="delete-modal-warning">This action cannot be undone.</p>
        </div>

        <div className="delete-modal-footer">
          <button
            type="button"
            className="delete-modal-btn delete-modal-btn--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="delete-modal-btn delete-modal-btn--delete"
            onClick={onConfirm}
          >
            <i className="bi bi-trash"></i>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
