import React, { useState, useMemo, useEffect } from 'react';
import EditRecordModal from './EditRecordModal';
import ErrorAlert from './ErrorAlert';
import { getWorkouts } from '../utils/storage';
import '../styles/components/Records.css';

const Records = () => {
  const [selectedWorkout, setSelectedWorkout] = useState('All Workouts');
  const [editingRecord, setEditingRecord] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [editedRecords, setEditedRecords] = useState({});
  const [deletedRecordIds, setDeletedRecordIds] = useState(new Set());
  const [workouts, setWorkouts] = useState([]);

  // Load workouts from localStorage
  useEffect(() => {
    loadWorkouts();
    // Listen for workout updates
    const handleWorkoutUpdate = () => {
      loadWorkouts();
    };
    window.addEventListener('workoutSaved', handleWorkoutUpdate);
    return () => window.removeEventListener('workoutSaved', handleWorkoutUpdate);
  }, []);

  const loadWorkouts = () => {
    const savedWorkouts = getWorkouts();
    setWorkouts(savedWorkouts);
  };


  const workoutOptions = useMemo(() => {
    const uniqueNames = [...new Set(workouts.map(w => w.name))];
    return ['All Workouts', ...uniqueNames];
  }, [workouts]);

  // Вычисление records (лучших результатов по каждому упражнению)
  const computedRecords = useMemo(() => {
    const recordsMap = {};

    // Фильтрация по выбранной тренировке
    const filteredWorkouts = selectedWorkout === 'All Workouts' 
      ? workouts 
      : workouts.filter(w => w.name === selectedWorkout);

    // Сбор всех упражнений из выбранных тренировок
    filteredWorkouts.forEach(workout => {
      const exercisesList = workout.exercisesList || [];
      const workoutDate = workout.date || workout.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0];
      
      exercisesList.forEach(ex => {
        const key = ex.exercise;
        const exerciseDate = ex.date || workoutDate;
        const weight = ex.weight || 0;
        const reps = ex.reps || 0;
        const sets = ex.sets || 0;
        
        if (!recordsMap[key]) {
          recordsMap[key] = {
            id: `${ex.exercise}-${ex.muscleGroup}`,
            exercise: ex.exercise,
            muscleGroup: ex.muscleGroup,
            maxWeight: weight,
            maxReps: reps,
            maxSets: sets,
            lastDate: exerciseDate,
            workoutName: workout.name
          };
        } else {
          // Обновление максимальных значений
          if (weight > recordsMap[key].maxWeight) {
            recordsMap[key].maxWeight = weight;
          }
          if (reps > recordsMap[key].maxReps) {
            recordsMap[key].maxReps = reps;
          }
          if (sets > recordsMap[key].maxSets) {
            recordsMap[key].maxSets = sets;
          }
          // Обновление последней даты
          if (new Date(exerciseDate) > new Date(recordsMap[key].lastDate)) {
            recordsMap[key].lastDate = exerciseDate;
            recordsMap[key].workoutName = workout.name;
          }
        }
      });
    });

    return Object.values(recordsMap);
  }, [selectedWorkout]);

  // Применение редактированных записей к computed records и фильтрация удаленных
  const records = useMemo(() => {
    return computedRecords
      .filter(record => !deletedRecordIds.has(record.id))
      .map(record => {
        if (editedRecords[record.id]) {
          return editedRecords[record.id];
        }
        return record;
      });
  }, [computedRecords, editedRecords, deletedRecordIds]);

  const handleEdit = (record) => {
    setEditingRecord(record);
  };

  const handleSaveEdit = (updatedRecord) => {
    setEditedRecords(prev => ({
      ...prev,
      [updatedRecord.id]: updatedRecord
    }));
    setEditingRecord(null);
  };

  const handleDeleteClick = (record) => {
    setRecordToDelete(record);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = () => {
    if (recordToDelete) {
      setDeletedRecordIds(prev => new Set([...prev, recordToDelete.id]));
      setEditedRecords(prev => {
        const newRecords = { ...prev };
        delete newRecords[recordToDelete.id];
        return newRecords;
      });
      setShowDeleteConfirm(false);
      setRecordToDelete(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="records">
      <div className="records-header">
        <select 
          className="workout-selector"
          value={selectedWorkout}
          onChange={(e) => setSelectedWorkout(e.target.value)}
        >
          {workoutOptions.map((workout) => (
            <option key={workout} value={workout}>
              {workout}
            </option>
          ))}
        </select>
      </div>
      
      <div className="records-list">
        {records.length === 0 ? (
          <div className="records-placeholder">
            <p>No records yet</p>
          </div>
        ) : (
          records.map((record) => (
            <div key={record.id} className="record-item">
              <div className="record-header">
                <div>
                  <div className="record-exercise-name">{record.exercise}</div>
                  <div className="record-muscle-group">{record.muscleGroup}</div>
                </div>
                <div className="record-actions">
                  <button 
                    className="record-edit-btn"
                    onClick={() => handleEdit(record)}
                    aria-label="Edit record"
                  >
                    ✏️
                  </button>
                  <button 
                    className="record-delete-btn"
                    onClick={() => handleDeleteClick(record)}
                    aria-label="Delete record"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="record-stats">
                <div className="record-stat">
                  <span className="record-stat-label">Max Weight</span>
                  <span className="record-stat-value">{record.maxWeight} kg</span>
                </div>
                <div className="record-stat">
                  <span className="record-stat-label">Max Reps</span>
                  <span className="record-stat-value">{record.maxReps}</span>
                </div>
                <div className="record-stat">
                  <span className="record-stat-label">Max Sets</span>
                  <span className="record-stat-value">{record.maxSets}</span>
                </div>
              </div>
              <div className="record-footer">
                <span className="record-date">Last: {formatDate(record.lastDate)}</span>
                <span className="record-workout">{record.workoutName}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Record Modal */}
      <EditRecordModal
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        record={editingRecord}
        onSave={handleSaveEdit}
      />

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="delete-confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="delete-confirm-content" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Record?</h3>
            <p>Are you sure you want to delete the record for "{recordToDelete?.exercise}"? This action cannot be undone.</p>
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
    </div>
  );
};

export default Records;
