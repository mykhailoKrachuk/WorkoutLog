import React, { useState } from 'react';
import ErrorAlert from './ErrorAlert';
import '../styles/components/AddExerciseModal.css';

// Данные для пикеров
const MUSCLE_GROUPS = [
  'Klatka piersiowa',
  'Nogi',
  'Plecy',
  'Ramiona',
  'Brzuch'
];

const EXERCISES_BY_GROUP = {
  'Klatka piersiowa': [
    'Wyciskanie leżąc',
    'Wyciskanie na skosie',
    'Rozpiętki',
    'Pompki'
  ],
  'Nogi': [
    'Przysiady',
    'Martwy ciąg',
    'Wyciskanie nogami',
    'Wykroki',
    'Przysiady bułgarskie'
  ],
  'Plecy': [
    'Martwy ciąg',
    'Podciąganie',
    'Wiosłowanie',
    'Ściąganie drążka',
    'Unoszenie tułowia'
  ],
  'Ramiona': [
    'Wyciskanie nad głową',
    'Unoszenie bokiem',
    'Unoszenie przodem',
    'Triceps na wyciągu'
  ],
  'Brzuch': [
    'Brzuszki',
    'Plank',
    'Unoszenie nóg',
    'Rowerek'
  ]
};

const AddExerciseModal = ({ isOpen, onClose, onAdd }) => {
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [isCustomExercise, setIsCustomExercise] = useState(false);
  const [customExerciseName, setCustomExerciseName] = useState('');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [sets, setSets] = useState('1');
  const [notes, setNotes] = useState('');
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const availableExercises = selectedMuscleGroup ? EXERCISES_BY_GROUP[selectedMuscleGroup] || [] : [];

  const handleAdd = () => {
    // Валидация
    if (!selectedMuscleGroup) {
      const errorMsg = 'Wybierz grupę mięśni';
      setErrorMessage(errorMsg);
      setShowErrorAlert(true);
      return;
    }

    if (!isCustomExercise && !selectedExercise) {
      const errorMsg = 'Wybierz ćwiczenie lub dodaj własne';
      setErrorMessage(errorMsg);
      setShowErrorAlert(true);
      return;
    }

    if (isCustomExercise && !customExerciseName.trim()) {
      const errorMsg = 'Wprowadź nazwę ćwiczenia';
      setErrorMessage(errorMsg);
      setShowErrorAlert(true);
      return;
    }

    if (!weight || weight.trim() === '') {
      const errorMsg = 'Wprowadź wagę';
      setErrorMessage(errorMsg);
      setShowErrorAlert(true);
      return;
    }

    if (!reps || reps.trim() === '') {
      const errorMsg = 'Wprowadź liczbę powtórzeń';
      setErrorMessage(errorMsg);
      setShowErrorAlert(true);
      return;
    }

    if (!sets || sets.trim() === '' || parseInt(sets) < 1) {
      const errorMsg = 'Number of sets must be at least 1';
      setErrorMessage(errorMsg);
      setShowErrorAlert(true);
      return;
    }

    const weightNum = parseFloat(weight);
    const repsNum = parseInt(reps);
    const setsNum = parseInt(sets);

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

    // Создание серий
    const series = [];
    for (let i = 0; i < setsNum; i++) {
      series.push({
        setNumber: i + 1,
        weight: weightNum,
        reps: repsNum
      });
    }

    // Добавление упражнения
    const newExercise = {
      id: Date.now(),
      muscleGroup: selectedMuscleGroup,
      exercise: isCustomExercise ? customExerciseName : selectedExercise,
      isCustom: isCustomExercise,
      weight: weightNum,
      reps: repsNum,
      sets: setsNum,
      series: series,
      notes: notes.trim()
    };

    onAdd(newExercise);
    
    // Сброс формы
    setSelectedMuscleGroup('');
    setSelectedExercise('');
    setIsCustomExercise(false);
    setCustomExerciseName('');
    setWeight('');
    setReps('');
    setSets('1');
    setNotes('');
    setShowErrorAlert(false);
    setErrorMessage('');
    onClose();
  };

  const handleCancel = () => {
    setSelectedMuscleGroup('');
    setSelectedExercise('');
    setIsCustomExercise(false);
    setCustomExerciseName('');
    setWeight('');
    setReps('');
    setSets('1');
    setNotes('');
    setShowErrorAlert(false);
    setErrorMessage('');
    onClose();
  };

  if (!isOpen) return null;

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
      <div className="add-exercise-modal-overlay" onClick={handleCancel}>
        <div className="add-exercise-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="add-exercise-modal-header">
            <h2 className="add-exercise-modal-title">Dodaj ćwiczenie</h2>
            <button className="add-exercise-modal-close" onClick={handleCancel}>×</button>
          </div>

          <div className="add-exercise-modal-body">
            {/* Picker группы мышц */}
            <div className="picker-group">
              <label className="picker-label">Grupa mięśni</label>
              <select
                className="picker-select"
                value={selectedMuscleGroup}
                onChange={(e) => {
                  setSelectedMuscleGroup(e.target.value);
                  setSelectedExercise(''); // Сброс упражнения при смене группы
                }}
              >
                <option value="">Wybierz grupę mięśni</option>
                {MUSCLE_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>

            {/* Picker упражнения или Custom */}
            {!isCustomExercise ? (
              <div className="picker-group">
                <label className="picker-label">Ćwiczenie</label>
                <select
                  className="picker-select"
                  value={selectedExercise}
                  onChange={(e) => setSelectedExercise(e.target.value)}
                  disabled={!selectedMuscleGroup}
                >
                  <option value="">Wybierz ćwiczenie</option>
                  {availableExercises.map((exercise) => (
                    <option key={exercise} value={exercise}>
                      {exercise}
                    </option>
                  ))}
                </select>
                <button 
                  className="add-custom-exercise-btn"
                  onClick={() => setIsCustomExercise(true)}
                  disabled={!selectedMuscleGroup}
                >
                  + Add Custom Exercise
                </button>
              </div>
            ) : (
              <div className="picker-group">
                <label className="picker-label">Custom Exercise Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={customExerciseName}
                  onChange={(e) => setCustomExerciseName(e.target.value)}
                  placeholder="Enter exercise name"
                />
                <button 
                  className="cancel-custom-exercise-btn"
                  onClick={() => {
                    setIsCustomExercise(false);
                    setCustomExerciseName('');
                  }}
                >
                  Use predefined exercise
                </button>
              </div>
            )}

            {/* Вес */}
            <div className="input-group">
              <label className="input-label">Weight (kg)</label>
              <input
                type="number"
                className="input-field"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0"
                min="0"
                step="0.5"
              />
            </div>

            {/* Повторения */}
            <div className="input-group">
              <label className="input-label">Reps</label>
              <input
                type="number"
                className="input-field"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="0"
                min="1"
              />
            </div>

            {/* Количество сетов */}
            <div className="input-group">
              <label className="input-label">Number of Sets</label>
              <input
                type="number"
                className="input-field"
                value={sets}
                onChange={(e) => setSets(e.target.value)}
                placeholder="1"
                min="1"
              />
            </div>

            {/* Заметки */}
            <div className="input-group">
              <label className="input-label">Notes (optional)</label>
              <textarea
                className="input-textarea"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add notes about this exercise..."
                rows="3"
              />
            </div>
          </div>

          <div className="add-exercise-modal-footer">
            <button className="add-exercise-cancel-btn" onClick={handleCancel}>
              Anuluj
            </button>
            <button className="add-exercise-add-btn" onClick={handleAdd}>
              Dodaj
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddExerciseModal;
