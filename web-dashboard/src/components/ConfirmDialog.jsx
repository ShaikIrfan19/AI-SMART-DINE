import React from 'react';
import Modal from './Modal';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title = 'Are you sure?', message, confirmText = 'Delete', confirmClass = 'btn-danger' }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="confirm-message">{message}</p>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className={`btn ${confirmClass}`} onClick={() => { onConfirm(); onClose(); }}>
          {confirmText}
        </button>
      </div>
    </Modal>
  );
}
