import React, { useState } from 'react';
import AddExerciseModal from './AddExerciseModal';
import TemplatesModal from './TemplatesModal';
import '../styles/components/CreateWorkoutModal.css';

const CreateWorkoutModal = ({ isOpen, onClose, onSave }) => {
  const [exercises, setExercises] = useState([]);
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);

  const handleAddExercise = (exercise) => {
    setExercises([...exercises, exercise]);
  };

  const handleRemoveExercise = (id) => {
    setExercises(exercises.filter(ex => ex.id !== id));
  };

  const handleSaveWorkout = () => {
    if (exercises.length === 0) {
      return;
    }
    const workout = {
      exercises: exercises,
      notes: workoutNotes.trim()
    };
    onSave(workout);
    setExercises([]);
    setWorkoutNotes('');
    onClose();
  };

  const handleClose = () => {
    setExercises([]);
    setWorkoutNotes('');
    onClose();
  };

  const handleSelectTemplate = (template) => {
    setExercises([...template.exercises]);
    setShowTemplatesModal(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="modal-overlay" onClick={handleClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <button className="modal-templates-btn" onClick={() => setShowTemplatesModal(true)}>
              Templates
            </button>
            <h2 className="modal-title">Workout</h2>
            <div className="modal-close-wrapper">
              <button className="modal-close" onClick={handleClose}>×</button>
            </div>
          </div>

          <div className="modal-body">
            {/* Список упражнений */}
            <div className="exercises-list">
              {exercises.length === 0 ? (
                <div className="empty-exercises">
                  <p>No exercises yet</p>
                </div>
              ) : (
                exercises.map((ex) => (
                  <div key={ex.id} className="exercise-item-card">
                    <div className="exercise-item-info">
                      <div className="exercise-item-name">
                        {ex.exercise}
                        {ex.isCustom && <span className="custom-badge">Custom</span>}
                      </div>
                      <div className="exercise-item-details">
                        {ex.muscleGroup} • {ex.weight} kg • {ex.reps} reps
                        {ex.sets && ` • ${ex.sets} sets`}
                      </div>
                      {ex.notes && (
                        <div className="exercise-item-notes">📝 {ex.notes}</div>
                      )}
                    </div>
                    <button 
                      className="remove-exercise-btn"
                      onClick={() => handleRemoveExercise(ex.id)}
                    >
                      ×
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Workout Notes */}
            <div className="workout-notes-section">
              <label className="workout-notes-label">Workout Notes (optional)</label>
              <textarea
                className="workout-notes-textarea"
                value={workoutNotes}
                onChange={(e) => setWorkoutNotes(e.target.value)}
                placeholder="Add notes about this workout..."
                rows="3"
              />
            </div>

            {/* Кнопка добавления упражнения - внизу */}
            <div className="add-exercise-button-container">
              <button 
                className="add-exercise-button"
                onClick={() => setShowAddExerciseModal(true)}
              >
                <span className="add-icon">+</span>
                Add exercise
              </button>
            </div>
          </div>

          <div className="modal-footer">
            <button className="modal-save-btn" onClick={handleSaveWorkout}>
              Zapisz trening
            </button>
          </div>
        </div>
      </div>

      {/* Модальное окно добавления упражнения (nested) */}
      <AddExerciseModal
        isOpen={showAddExerciseModal}
        onClose={() => setShowAddExerciseModal(false)}
        onAdd={handleAddExercise}
      />

      {/* Модальное окно Templates (nested) */}
      <TemplatesModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        onSelectTemplate={handleSelectTemplate}
      />
    </>
  );
};

export default CreateWorkoutModal;
