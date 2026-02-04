import React, { useState, useEffect } from 'react';
import AddExerciseModal from './AddExerciseModal';
import '../styles/components/EditWorkoutModal.css';

const EditWorkoutModal = ({ isOpen, onClose, workout, onSave }) => {
  const [exercises, setExercises] = useState([]);
  const [workoutName, setWorkoutName] = useState('');
  const [workoutNotes, setWorkoutNotes] = useState('');
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);

  useEffect(() => {
    if (workout) {
      setExercises(workout.exercisesList || workout.exercises || []);
      setWorkoutName(workout.name || '');
      setWorkoutNotes(workout.notes || '');
    }
  }, [workout]);

  const handleAddExercise = (exercise) => {
    setExercises([...exercises, exercise]);
  };

  const handleRemoveExercise = (id) => {
    setExercises(exercises.filter(ex => ex.id !== id));
  };

  const handleSave = () => {
    const updatedWorkout = {
      ...workout,
      name: workoutName,
      exercises: exercises.length,
      exercisesList: exercises,
      notes: workoutNotes
    };
    onSave(updatedWorkout);
    onClose();
  };

  if (!isOpen || !workout) return null;

  return (
    <>
      <div className="edit-workout-overlay" onClick={onClose}>
        <div className="edit-workout-content" onClick={(e) => e.stopPropagation()}>
          <div className="edit-workout-header">
            <h2 className="edit-workout-title">Edit Workout</h2>
            <button className="edit-workout-close" onClick={onClose}>×</button>
          </div>

          <div className="edit-workout-body">
            <div className="input-group">
              <label className="input-label">Workout Name</label>
              <input
                type="text"
                className="input-field"
                value={workoutName}
                onChange={(e) => setWorkoutName(e.target.value)}
                placeholder="Enter workout name"
              />
            </div>

            <div className="exercises-list">
              <div className="exercises-list-header">
                <h3>Exercises</h3>
              </div>
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

            <button 
              className="add-exercise-button"
              onClick={() => setShowAddExerciseModal(true)}
            >
              <span className="add-exercise-icon">+</span>
              Add Exercise
            </button>

            <div className="input-group">
              <label className="input-label">Workout Notes (optional)</label>
              <textarea
                className="input-textarea"
                value={workoutNotes}
                onChange={(e) => setWorkoutNotes(e.target.value)}
                placeholder="Add notes about this workout..."
                rows="3"
              />
            </div>
          </div>

          <div className="edit-workout-footer">
            <button className="edit-workout-cancel-btn" onClick={onClose}>
              Cancel
            </button>
            <button className="edit-workout-save-btn" onClick={handleSave}>
              Save Changes
            </button>
          </div>
        </div>
      </div>

      <AddExerciseModal
        isOpen={showAddExerciseModal}
        onClose={() => setShowAddExerciseModal(false)}
        onAdd={handleAddExercise}
      />
    </>
  );
};

export default EditWorkoutModal;
