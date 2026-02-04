import React, { useEffect, useState } from 'react';
import EditWorkoutModal from './EditWorkoutModal';
import { getWorkout } from '../utils/api';
import '../styles/components/WorkoutDetailsModal.css';

const WorkoutDetailsModal = ({ isOpen, onClose, workout, onDelete, onEdit, onSave }) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [detailedWorkout, setDetailedWorkout] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);

  // Подгружаем полные данные тренировки (включая sets) при открытии модалки
  useEffect(() => {
    if (!isOpen || !workout?.id) return;

    // Если в уже переданном объекте есть exercisesList, используем его
    if (workout.exercisesList && workout.exercisesList.length > 0) {
      setDetailedWorkout(workout);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    getWorkout(workout.id)
      .then((data) => {
        if (cancelled || !data) return;

        const exercisesMap = (data.sets || []).reduce((acc, s) => {
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
          acc[key].series.push({
            setNumber: s.set_number,
            weight: s.weight,
            reps: s.reps,
          });
          acc[key].sets = acc[key].series.length;
          return acc;
        }, {});

        const exercisesList = Object.values(exercisesMap);

        setDetailedWorkout({
          ...workout,
          // Берём свежие данные по дате/типу/заметке из backend, если есть
          date: data.date || workout.date,
          name: data.type || data.template_name || workout.name,
          note: data.note ?? workout.note,
          exercisesList,
        });
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(e?.message || 'Failed to load workout details');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, workout]);

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

  const workoutToShow = detailedWorkout || workout;
  if (!isOpen || !workoutToShow) return null;
  const exercisesList = workoutToShow.exercisesList || [];

  return (
    <>
      <div className="workout-details-overlay" onClick={onClose}>
        <div className="workout-details-content" onClick={(e) => e.stopPropagation()}>
          <div className="workout-details-header">
            <div className="workout-details-title-section">
              <h2 className="workout-details-title">{workoutToShow.name}</h2>
              <div className="workout-details-date">{workoutToShow.date}</div>
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
              {isLoading ? (
                <div className="empty-workout-exercises">
                  <p>Loading...</p>
                </div>
              ) : loadError ? (
                <div className="empty-workout-exercises">
                  <p>{loadError}</p>
                </div>
              ) : exercisesList && exercisesList.length > 0 ? (
                exercisesList.map((ex) => (
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
