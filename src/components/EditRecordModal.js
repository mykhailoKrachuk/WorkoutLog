import React, { useState, useEffect } from 'react';
import ErrorAlert from './ErrorAlert';
import '../styles/components/EditRecordModal.css';

const MUSCLE_GROUPS = [
  'Klatka piersiowa',
  'Nogi',
  'Plecy',
  'Ramiona',
  'Brzuch'
];

const EditRecordModal = ({ isOpen, onClose, record, onSave }) => {
  const [maxWeight, setMaxWeight] = useState('');
  const [maxReps, setMaxReps] = useState('');
  const [maxSets, setMaxSets] = useState('');
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (record) {
      setMaxWeight(record.maxWeight?.toString() || '');
      setMaxReps(record.maxReps?.toString() || '');
      setMaxSets(record.maxSets?.toString() || '');
    }
  }, [record]);

  const handleSave = () => {
    if (!maxWeight || maxWeight.trim() === '') {
      const errorMsg = 'Wprowadź maksymalną wagę';
      setErrorMessage(errorMsg);
      setShowErrorAlert(true);
      return;
    }

    if (!maxReps || maxReps.trim() === '') {
      const errorMsg = 'Wprowadź maksymalną liczbę powtórzeń';
      setErrorMessage(errorMsg);
      setShowErrorAlert(true);
      return;
    }

    if (!maxSets || maxSets.trim() === '') {
      const errorMsg = 'Wprowadź maksymalną liczbę serii';
      setErrorMessage(errorMsg);
      setShowErrorAlert(true);
      return;
    }

    const weightNum = parseFloat(maxWeight);
    const repsNum = parseInt(maxReps);
    const setsNum = parseInt(maxSets);

    if (isNaN(weightNum) || weightNum < 0) {
      const errorMsg = 'Weight must be 0 or more';
      setErrorMessage(errorMsg);
      setShowErrorAlert(true);
      return;
    }

    if (isNaN(repsNum) || repsNum < 1) {
      const errorMsg = 'Reps must be at least 1';
      setErrorMessage(errorMsg);
      setShowErrorAlert(true);
      return;
    }

    if (isNaN(setsNum) || setsNum < 1) {
      const errorMsg = 'Sets must be at least 1';
      setErrorMessage(errorMsg);
      setShowErrorAlert(true);
      return;
    }

    const updatedRecord = {
      ...record,
      maxWeight: weightNum,
      maxReps: repsNum,
      maxSets: setsNum
    };

    onSave(updatedRecord);
    handleCancel();
  };

  const handleCancel = () => {
    setMaxWeight('');
    setMaxReps('');
    setMaxSets('');
    setShowErrorAlert(false);
    setErrorMessage('');
    onClose();
  };

  if (!isOpen || !record) return null;

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
      <div className="edit-record-overlay" onClick={handleCancel}>
        <div className="edit-record-content" onClick={(e) => e.stopPropagation()}>
          <div className="edit-record-header">
            <h2 className="edit-record-title">Edit Record</h2>
            <button className="edit-record-close" onClick={handleCancel}>×</button>
          </div>

          <div className="edit-record-body">
            <div className="edit-record-info">
              <div className="edit-record-exercise-name">{record.exercise}</div>
              <div className="edit-record-muscle-group">{record.muscleGroup}</div>
            </div>

            <div className="edit-record-form">
              <div className="input-group">
                <label className="input-label">Max Weight (kg)</label>
                <input
                  type="number"
                  className="input-field"
                  value={maxWeight}
                  onChange={(e) => setMaxWeight(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.5"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Max Reps</label>
                <input
                  type="number"
                  className="input-field"
                  value={maxReps}
                  onChange={(e) => setMaxReps(e.target.value)}
                  placeholder="0"
                  min="1"
                />
              </div>

              <div className="input-group">
                <label className="input-label">Max Sets</label>
                <input
                  type="number"
                  className="input-field"
                  value={maxSets}
                  onChange={(e) => setMaxSets(e.target.value)}
                  placeholder="0"
                  min="1"
                />
              </div>
            </div>
          </div>

          <div className="edit-record-footer">
            <button className="edit-record-cancel-btn" onClick={handleCancel}>
              Cancel
            </button>
            <button className="edit-record-save-btn" onClick={handleSave}>
              Save
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditRecordModal;
