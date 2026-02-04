import React, { useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import EditRecordModal from './EditRecordModal';
import ErrorAlert from './ErrorAlert';
import { getRecords } from '../utils/api';
import '../styles/components/Records.css';

const Records = forwardRef((props, ref) => {
  const [sortBy, setSortBy] = useState('max_weight');
  const [editingRecord, setEditingRecord] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [editedRecords, setEditedRecords] = useState({});
  const [deletedRecordIds, setDeletedRecordIds] = useState(new Set());
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadRecords = (currentSortBy = sortBy) => {
    let cancelled = false;
    setIsLoading(true);
    setShowErrorAlert(false);
    setErrorMessage('');

    getRecords({ sortBy: currentSortBy })
      .then((data) => {
        if (cancelled) return;
        const rows = (data?.records || []).map((r) => ({
          id: String(r.exercise_id),
          exercise: r.exercise_name,
          muscleGroup: r.muscle_group,
          maxWeight: r.max_weight || 0,
          maxReps: r.max_reps || 0,
          maxSets: r.total_sets || 0,
          lastDate: r.last_date || new Date().toISOString().split('T')[0],
          workoutName: r.last_workout_type || 'Workout',
        }));
        setRecords(rows);
      })
      .catch((e) => {
        if (cancelled) return;
        setErrorMessage(e?.message || 'Failed to load records');
        setShowErrorAlert(true);
        setRecords([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  };

  useEffect(() => {
    const cancel = loadRecords(sortBy);
    return cancel;
  }, [sortBy]);

  useImperativeHandle(ref, () => ({
    reload: () => loadRecords(sortBy),
  }));

  const visibleRecords = records
    .filter(record => !deletedRecordIds.has(record.id))
    .map(record => (editedRecords[record.id] ? editedRecords[record.id] : record));

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
      {showErrorAlert && (
        <ErrorAlert
          message={errorMessage}
          onClose={() => {
            setShowErrorAlert(false);
            setErrorMessage('');
          }}
        />
      )}
      <div className="records-header">
        <select 
          className="workout-selector"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="max_weight">Max Weight</option>
          <option value="max_reps">Max Reps</option>
          <option value="max_volume">Max Volume</option>
          <option value="muscle_group">Muscle Group</option>
          <option value="name">Name</option>
        </select>
      </div>
      
      <div className="records-list">
        {isLoading ? (
          <div className="records-placeholder">
            <p>Loading...</p>
          </div>
        ) : visibleRecords.length === 0 ? (
          <div className="records-placeholder">
            <p>No records yet</p>
          </div>
        ) : (
          visibleRecords.map((record) => (
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

      <EditRecordModal
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        record={editingRecord}
        onSave={handleSaveEdit}
      />

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
});

export default Records;
