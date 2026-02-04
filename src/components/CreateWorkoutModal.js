import React, { useState } from 'react';
import AddExerciseModal from './AddExerciseModal';
import TemplatesModal from './TemplatesModal';
import ErrorAlert from './ErrorAlert';
import { createSet, createWorkout } from '../utils/api';
import '../styles/components/CreateWorkoutModal.css';

const CreateWorkoutModal = ({ isOpen, onClose, onSave }) => {
  const [exercises, setExercises] = useState([]);
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [workoutType, setWorkoutType] = useState('Workout');
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleAddExercise = (exercise) => {
    setExercises((prev) => [...prev, exercise]);
  };

  const handleRemoveExercise = (id) => {
    setExercises(exercises.filter(ex => ex.id !== id));
  };

  const handleSaveWorkout = async () => {
    if (exercises.length === 0) {
      return;
    }

    setIsSaving(true);
    setShowErrorAlert(false);
    setErrorMessage('');

    try {
      const today = new Date().toISOString().split('T')[0];
      const created = await createWorkout({
        date: today,
        type: workoutType || 'Workout',
        note: workoutNotes.trim() || null,
      });

      const workoutId = created?.id;
      if (!workoutId) throw new Error('Backend did not return workout id');

      const setCreates = [];
      for (const ex of exercises) {
        if (!ex.exerciseId) {
          throw new Error(`Missing exerciseId for "${ex.exercise}" (reload exercises list and try again)`);
        }
        const series = ex.series && ex.series.length > 0
          ? ex.series
          : [{ setNumber: 1, weight: ex.weight, reps: ex.reps }];

        for (const s of series) {
          setCreates.push(createSet({
            workout_id: workoutId,
            exercise_id: ex.exerciseId,
            weight: Number(s.weight),
            reps: Number(s.reps),
            set_number: s.setNumber || null,
          }));
        }
      }
      await Promise.all(setCreates);

      if (onSave) onSave({ id: workoutId });

      setExercises([]);
      setWorkoutNotes('');
      setWorkoutType('Workout');
      onClose();
    } catch (e) {
      setErrorMessage(e?.message || 'Failed to save workout');
      setShowErrorAlert(true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setExercises([]);
    setWorkoutNotes('');
    setWorkoutType('Workout');
    onClose();
  };

  const handleSelectTemplate = (template) => {
    setExercises([...template.exercises]);
    setShowTemplatesModal(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {showErrorAlert && (
        <ErrorAlert
          message={errorMessage}
          onClose={() => {
            setShowErrorAlert(false);
            setErrorMessage('');
          }}
        />
      )}
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
            <div className="workout-notes-section">
              <label className="workout-notes-label">Workout Type</label>
              <input
                className="workout-notes-textarea"
                value={workoutType}
                onChange={(e) => setWorkoutType(e.target.value)}
                placeholder="e.g. Push / Pull / Legs"
              />
            </div>

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
            <button className="modal-save-btn" onClick={handleSaveWorkout} disabled={isSaving}>
              Zapisz trening
            </button>
          </div>
        </div>
      </div>

      <AddExerciseModal
        isOpen={showAddExerciseModal}
        onClose={() => setShowAddExerciseModal(false)}
        onAdd={handleAddExercise}
      />

      <TemplatesModal
        isOpen={showTemplatesModal}
        onClose={() => setShowTemplatesModal(false)}
        onSelectTemplate={handleSelectTemplate}
      />
    </>
  );
};

export default CreateWorkoutModal;
