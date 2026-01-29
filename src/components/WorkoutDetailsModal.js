import React, { useState } from 'react';
import EditWorkoutModal from './EditWorkoutModal';
import '../styles/components/WorkoutDetailsModal.css';

const WorkoutDetailsModal = ({ isOpen, onClose, workout, onDelete, onEdit, onSave }) => {
  const [showEditModal, setShowEditModal] = useState(false);

  if (!isOpen || !workout) return null;

  const handleEditClick = () => {
    setShowEditModal(true);
  };

  const handleSaveEdit = (updatedWorkout) => {
    if (onSave) {
      onSave(updatedWorkout);
    }
    setShowEditModal(false);
    onClose();
  };

  return (
    <>
      <div className="workout-details-overlay" onClick={onClose}>
        <div className="workout-details-content" onClick={(e) => e.stopPropagation()}>
          <div className="workout-details-header">
            <div className="workout-details-title-section">
              <h2 className="workout-details-title">{workout.name}</h2>
              <div className="workout-details-date">{workout.date}</div>
            </div>
            <div className="workout-details-actions">
              <button 
                className="workout-edit-btn"
                onClick={handleEditClick}
                aria-label="Edit workout"
              >
                ✏️
              </button>
              <button className="workout-details-close" onClick={onClose}>×</button>
            </div>
          </div>

          <div className="workout-details-body">
            <div className="workout-exercises-list">
              {workout.exercisesList && workout.exercisesList.length > 0 ? (
                workout.exercisesList.map((ex) => (
                  <div key={ex.id} className="workout-exercise-item">
                    <div className="workout-exercise-info">
                      <div className="workout-exercise-name">{ex.exercise || ex.name}</div>
                      <div className="workout-exercise-details">
                        {ex.muscleGroup} • {ex.weight} kg • {ex.reps} reps
                        {ex.sets && ` • ${ex.sets} sets`}
                        {ex.series && ex.series.length > 0 && ` • ${ex.series.length} series`}
                      </div>
                      {ex.notes && (
                        <div className="workout-exercise-notes">
                          📝 {ex.notes}
                        </div>
                      )}
                    </div>
                    <button 
                      className="delete-exercise-btn"
                      onClick={() => {
                        // Handle exercise deletion
                        console.log('Delete exercise', ex.id);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))
              ) : (
                <div className="empty-workout-exercises">
                  <p>No exercises in this workout</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <EditWorkoutModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        workout={workout}
        onSave={handleSaveEdit}
      />
    </>
  );
};

export default WorkoutDetailsModal;
