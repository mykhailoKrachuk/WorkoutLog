import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SetRow from './SetRow';
import '../styles/components/CreateWorkoutScreen.css';

const CreateWorkoutScreen = () => {
  const navigate = useNavigate();
  const [sets, setSets] = useState([
    { id: 1, weight: '', reps: '', sets: '' },
  ]);

  const addSet = () => {
    const newSet = {
      id: Date.now(),
      weight: '',
      reps: '',
      sets: '',
    };
    setSets([...sets, newSet]);
  };

  const updateSet = (id, field, value) => {
    setSets(sets.map(set => 
      set.id === id ? { ...set, [field]: value } : set
    ));
  };

  const removeSet = (id) => {
    if (sets.length > 1) {
      setSets(sets.filter(set => set.id !== id));
    }
  };

  const handleSave = () => {
    // Здесь будет логика сохранения тренировки
    console.log('Zapisywanie treningu:', sets);
    navigate('/');
  };

  const handleCancel = () => {
    navigate('/');
  };

  return (
    <div className="create-workout-screen">
      <header className="create-header">
        <button className="back-button" onClick={handleCancel}>
          ← Wstecz
        </button>
        <h1 className="create-title">Nowy trening</h1>
        <button className="save-button" onClick={handleSave}>
          Zapisz
        </button>
      </header>

      <div className="create-content">
        <div className="sets-container">
          <div className="sets-header">
            <h2>Sety</h2>
            <button className="add-set-button" onClick={addSet}>
              + Dodaj set
            </button>
          </div>

          <div className="sets-table">
            <div className="sets-table-header">
              <div className="header-cell">Waga (kg)</div>
              <div className="header-cell">Powtórzenia</div>
              <div className="header-cell">Serie</div>
              <div className="header-cell actions">Akcje</div>
            </div>

            <div className="sets-list">
              {sets.map((set) => (
                <SetRow
                  key={set.id}
                  set={set}
                  onUpdate={updateSet}
                  onRemove={removeSet}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateWorkoutScreen;

