import React from 'react';
import '../styles/components/SetRow.css';

const SetRow = ({ set, onUpdate, onRemove }) => {
  const handleChange = (field, value) => {
    onUpdate(set.id, field, value);
  };

  return (
    <div className="set-row">
      <div className="set-row-grid">
        <div className="set-input-group">
          <input
            type="number"
            className="set-input"
            placeholder="0"
            value={set.weight}
            onChange={(e) => handleChange('weight', e.target.value)}
            min="0"
            step="0.5"
          />
          <span className="set-unit">kg</span>
        </div>

        <div className="set-input-group">
          <input
            type="number"
            className="set-input"
            placeholder="0"
            value={set.reps}
            onChange={(e) => handleChange('reps', e.target.value)}
            min="0"
          />
          <span className="set-unit">razy</span>
        </div>

        <div className="set-input-group">
          <input
            type="number"
            className="set-input"
            placeholder="0"
            value={set.sets}
            onChange={(e) => handleChange('sets', e.target.value)}
            min="0"
          />
          <span className="set-unit">serii</span>
        </div>

        <div className="set-actions">
          <button
            className="remove-set-button"
            onClick={() => onRemove(set.id)}
            aria-label="Usuń set"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetRow;

