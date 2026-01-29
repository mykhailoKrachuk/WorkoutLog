import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import WorkoutDetailsModal from './WorkoutDetailsModal';
import { deleteWorkout, getWorkoutsHistory } from '../utils/api';
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
    try {
      const data = await getWorkoutsHistory({ limit: 50, includeStats: false });
      const list = (data?.workouts || []).map((w) => ({
        id: w.id,
        date: w.date,
        name: w.type || w.template_name || 'Workout',
        note: w.note,
        exercises: w.statistics?.exercises_count ?? 0,
        exercisesList: (w.sets || []).reduce((acc, s) => {
          const key = String(s.exercise_id);
          if (!acc[key]) {
            acc[key] = {
              id: s.exercise_id,
              exerciseId: s.exercise_id,
              exercise: s.exercise_name,
              muscleGroup: s.muscle_group,
              series: [],
              sets: 0,
              weight: s.weight,
              reps: s.reps,
              notes: '',
            };
          }
          acc[key].series.push({ setNumber: s.set_number, weight: s.weight, reps: s.reps });
          acc[key].sets = acc[key].series.length;
          return acc;
        }, {}),
      }));

      // exercisesList reducer returns map; convert to array
      const normalized = list.map((w) => ({
        ...w,
        exercisesList: Object.values(w.exercisesList || {}),
      }));

      setWorkouts(normalized);
    } catch (e) {
      console.error('Failed to load workouts history:', e);
      setWorkouts([]);
    }
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

  const handleDeleteConfirm = () => {
    if (workoutToDelete) {
      deleteWorkout(workoutToDelete.id)
        .then(() => loadWorkouts())
        .catch((e) => console.error('Failed to delete workout:', e));
      setShowDeleteConfirm(false);
      setWorkoutToDelete(null);
      if (selectedWorkout && selectedWorkout.id === workoutToDelete.id) {
        setShowDetails(false);
        setSelectedWorkout(null);
      }
    }
  };

  const handleEdit = (workout) => {
    // Edit modal opens from WorkoutDetailsModal
  };

  const handleSaveWorkout = (updatedWorkout) => {
    // Editing not wired to API yet in this UI; just refresh.
    loadWorkouts();
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
        onDelete={(id) => {
          deleteWorkout(id)
            .then(() => loadWorkouts())
            .catch((e) => console.error('Failed to delete workout:', e));
          setShowDetails(false);
          setSelectedWorkout(null);
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

