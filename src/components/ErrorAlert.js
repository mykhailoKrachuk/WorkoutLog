import React from 'react';
import '../styles/components/ErrorAlert.css';

const ErrorAlert = ({ message, onClose }) => {
  if (!message) return null;

  return (
    <div className="error-alert-overlay" onClick={onClose}>
      <div className="error-alert-content" onClick={(e) => e.stopPropagation()}>
        <div className="error-alert-header">
          <h3 className="error-alert-title">Błąd</h3>
          <button className="error-alert-close" onClick={onClose}>×</button>
        </div>
        <div className="error-alert-body">
          <p className="error-alert-message">{message}</p>
        </div>
        <div className="error-alert-footer">
          <button className="error-alert-ok" onClick={onClose}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorAlert;
