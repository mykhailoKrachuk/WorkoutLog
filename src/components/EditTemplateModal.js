import React, { useState, useEffect } from 'react';
import '../styles/components/EditTemplateModal.css';

const EditTemplateModal = ({ isOpen, onClose, template, onSave }) => {
  const [templateName, setTemplateName] = useState('');

  useEffect(() => {
    if (template) {
      setTemplateName(template.name || '');
    }
  }, [template]);

  const handleSave = () => {
    if (!templateName.trim()) {
      return;
    }
    onSave({
      ...template,
      name: templateName.trim()
    });
    onClose();
  };

  if (!isOpen || !template) return null;

  return (
    <div className="edit-template-overlay" onClick={onClose}>
      <div className="edit-template-content" onClick={(e) => e.stopPropagation()}>
        <div className="edit-template-header">
          <h2 className="edit-template-title">Edit Template</h2>
          <button className="edit-template-close" onClick={onClose}>×</button>
        </div>

        <div className="edit-template-body">
          <div className="input-group">
            <label className="input-label">Template Name</label>
            <input
              type="text"
              className="input-field"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Enter template name"
              autoFocus
            />
          </div>
        </div>

        <div className="edit-template-footer">
          <button className="edit-template-cancel-btn" onClick={onClose}>
            Cancel
          </button>
          <button className="edit-template-save-btn" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditTemplateModal;
