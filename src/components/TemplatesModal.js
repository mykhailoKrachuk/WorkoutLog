import React, { useState, useEffect } from 'react';
import AddExerciseModal from './AddExerciseModal';
import EditTemplateModal from './EditTemplateModal';
import { getTemplates, saveTemplate, deleteTemplate } from '../utils/storage';
import '../styles/components/TemplatesModal.css';

const TemplatesModal = ({ isOpen, onClose, onSelectTemplate }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = () => {
    const savedTemplates = getTemplates();
    if (savedTemplates.length === 0) {
      const defaultTemplates = [
        { id: Date.now(), name: 'Push Day', exercises: [], createdAt: new Date().toISOString() },
        { id: Date.now() + 1, name: 'Pull Day', exercises: [], createdAt: new Date().toISOString() },
        { id: Date.now() + 2, name: 'Leg Day', exercises: [], createdAt: new Date().toISOString() },
      ];
      defaultTemplates.forEach(t => saveTemplate(t));
      setTemplates(defaultTemplates);
    } else {
      setTemplates(savedTemplates);
    }
  };

  const handleAddTemplate = () => {
    const newTemplate = {
      id: Date.now(),
      name: `Template ${templates.length + 1}`,
      exercises: [],
      createdAt: new Date().toISOString(),
    };
    saveTemplate(newTemplate);
    loadTemplates();
    setSelectedTemplate(newTemplate);
  };

  const handleAddExercise = (exercise) => {
    if (selectedTemplate) {
      const updatedTemplate = {
        ...selectedTemplate,
        exercises: [...selectedTemplate.exercises, exercise]
      };
      saveTemplate(updatedTemplate);
      loadTemplates();
      setSelectedTemplate(updatedTemplate);
      setShowAddExerciseModal(false);
    }
  };

  const handleRemoveExercise = (templateId, exerciseId) => {
    if (selectedTemplate && selectedTemplate.id === templateId) {
      const updatedTemplate = {
        ...selectedTemplate,
        exercises: selectedTemplate.exercises.filter(ex => ex.id !== exerciseId)
      };
      saveTemplate(updatedTemplate);
      loadTemplates();
      setSelectedTemplate(updatedTemplate);
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
  };

  const handleSaveTemplateEdit = (updatedTemplate) => {
    saveTemplate(updatedTemplate);
    loadTemplates();
    if (selectedTemplate && selectedTemplate.id === updatedTemplate.id) {
      setSelectedTemplate(updatedTemplate);
    }
    setEditingTemplate(null);
  };

  const handleDeleteTemplate = (templateId) => {
    deleteTemplate(templateId);
    loadTemplates();
    if (selectedTemplate && selectedTemplate.id === templateId) {
      setSelectedTemplate(null);
    }
  };

  const handleSelectTemplate = (template) => {
    onSelectTemplate(template);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="templates-modal-overlay" onClick={onClose}>
        <div className="templates-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="templates-modal-header">
            <h2 className="templates-modal-title">Templates</h2>
            <button className="templates-modal-close" onClick={onClose}>×</button>
          </div>

          <div className="templates-modal-body">
            <div className="templates-list">
              {templates.map((template) => (
                <div 
                  key={template.id} 
                  className={`template-item ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="template-name">{template.name}</div>
                  <div className="template-exercises-count">{template.exercises.length} exercises</div>
                  <button 
                    className="template-use-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectTemplate(template);
                    }}
                  >
                    Use
                  </button>
                </div>
              ))}
            </div>

            {selectedTemplate && (
              <div className="template-details">
                <div className="template-details-header">
                  <div className="template-details-title-section">
                    <h3>{selectedTemplate.name}</h3>
                    <div className="template-actions">
                      <button 
                        className="template-edit-btn"
                        onClick={() => handleEditTemplate(selectedTemplate)}
                        aria-label="Edit template"
                      >
                        ✏️
                      </button>
                      <button 
                        className="template-delete-btn"
                        onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                        aria-label="Delete template"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <button 
                    className="add-exercise-to-template-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddExerciseModal(true);
                    }}
                  >
                    + Add Exercise
                  </button>
                </div>
                <div className="template-exercises-list">
                  {selectedTemplate.exercises.length === 0 ? (
                    <div className="empty-template-exercises">
                      <p>No exercises yet</p>
                    </div>
                  ) : (
                    selectedTemplate.exercises.map((ex) => (
                      <div key={ex.id} className="template-exercise-item">
                        <div className="template-exercise-info">
                          <div className="template-exercise-name">{ex.exercise}</div>
                          <div className="template-exercise-details">
                            {ex.muscleGroup} • {ex.weight} kg • {ex.reps} reps
                          </div>
                        </div>
                        <button 
                          className="remove-template-exercise-btn"
                          onClick={() => handleRemoveExercise(selectedTemplate.id, ex.id)}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            <button 
              className="add-template-button"
              onClick={handleAddTemplate}
            >
              + Add Template
            </button>
          </div>
        </div>
      </div>

      <AddExerciseModal
        isOpen={showAddExerciseModal}
        onClose={() => setShowAddExerciseModal(false)}
        onAdd={handleAddExercise}
      />

      <EditTemplateModal
        isOpen={!!editingTemplate}
        onClose={() => setEditingTemplate(null)}
        template={editingTemplate}
        onSave={handleSaveTemplateEdit}
      />
    </>
  );
};

export default TemplatesModal;
