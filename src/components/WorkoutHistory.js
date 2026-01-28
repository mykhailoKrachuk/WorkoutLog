import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import WorkoutDetailsModal from './WorkoutDetailsModal';
import { getWorkouts, getWorkoutDetails, updateWorkout, deleteWorkout } from '../utils/storage';
import '../styles/components/WorkoutHistory.css';

const WorkoutHistory = forwardRef((props, ref) => {
  const [workouts, setWorkouts] = useState([]);
  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState(null);

  // Load workouts from localStorage on mount
  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    const list = await getWorkouts();
    const detailed = await Promise.all(
      list.map(async (w) => {
        const d = await getWorkoutDetails(w.id);
        return { ...w, exercises: d.exercises, exercisesList: d.exercisesList };
      })
    );
    setWorkouts(detailed);
  };


  // Expose load function for parent component
  useImperativeHandle(ref, () => ({
    reload: loadWorkouts
  }));

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', { 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const handleWorkoutClick = (workout) => {
    setSelectedWorkout({
      ...workout,
      date: formatDate(workout.date)
    });
    setShowDetails(true);
  };

  const handleDeleteClick = (e, workout) => {
    e.stopPropagation();
    setWorkoutToDelete(workout);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!workoutToDelete) return;

    await deleteWorkout(workoutToDelete.id);
    await loadWorkouts();

    setShowDeleteConfirm(false);
    setWorkoutToDelete(null);

    if (selectedWorkout && selectedWorkout.id === workoutToDelete.id) {
      setShowDetails(false);
      setSelectedWorkout(null);
    }

    window.dispatchEvent(new Event("workoutSaved"));
  };

  const handleEdit = (workout) => {
    // Edit modal opens from WorkoutDetailsModal
  };

  const handleSaveWorkout = async (updatedWorkout) => {
    await updateWorkout(updatedWorkout.id, updatedWorkout);
    await loadWorkouts();
    window.dispatchEvent(new Event("workoutSaved"));
  };

  return (
    <>
      <div className="workout-history">
        {workouts.length === 0 ? (
          <div className="empty-state">
            <p>Brak zakończonych treningów</p>
          </div>
        ) : (
          <ul className="workout-list">
            {workouts.map((workout) => (
              <li 
                key={workout.id} 
                className="workout-item"
                onClick={() => handleWorkoutClick(workout)}
              >
                <div className="workout-info">
                  <div className="workout-name">{workout.name}</div>
                  <div className="workout-meta">
                    <span className="workout-date">{formatDate(workout.date)}</span>
                    <span className="workout-exercises">{workout.exercises} ćwiczeń</span>
                  </div>
                </div>
                <button 
                  className="delete-workout-btn"
                  onClick={(e) => handleDeleteClick(e, workout)}
                  aria-label="Delete workout"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <WorkoutDetailsModal
        isOpen={showDetails}
        onClose={() => {
          setShowDetails(false);
          setSelectedWorkout(null);
        }}
        workout={selectedWorkout}
        onDelete={async (id) => {
          await deleteWorkout(id);
          await loadWorkouts();
          setShowDetails(false);
          setSelectedWorkout(null);
          window.dispatchEvent(new Event("workoutSaved"));
        }}
        onEdit={handleEdit}
        onSave={handleSaveWorkout}
      />

      {showDeleteConfirm && (
        <div className="delete-confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="delete-confirm-content" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Workout?</h3>
            <p>Are you sure you want to delete "{workoutToDelete?.name}"? This action cannot be undone.</p>
            <div className="delete-confirm-buttons">
              <button className="delete-cancel-btn" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="delete-confirm-btn" onClick={handleDeleteConfirm}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

WorkoutHistory.displayName = 'WorkoutHistory';

export default WorkoutHistory;

