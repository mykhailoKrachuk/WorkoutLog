import React, { useEffect, useMemo, useState } from 'react';
import ErrorAlert from './ErrorAlert';
import { createExercise, listExercises } from '../utils/api';
import '../styles/components/AddExerciseModal.css';


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
  const [isAdding, setIsAdding] = useState(false);

  const [muscleGroups, setMuscleGroups] = useState([]);
  const [exercisesByGroup, setExercisesByGroup] = useState({});
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setIsLoadingExercises(true);

    listExercises()
      .then((rows) => {
        if (cancelled) return;

        const byGroup = {};
        for (const r of rows || []) {
          const group = r.muscle_group || 'Other';
          const id = r.id;
          const name = r.name;
          if (!id || !name) continue;
          if (!byGroup[group]) byGroup[group] = [];
          byGroup[group].push({ id, name });
        }

        // Sort for stable UI.
        for (const g of Object.keys(byGroup)) {
          byGroup[g].sort((a, b) => a.name.localeCompare(b.name));
        }
        const groups = Object.keys(byGroup).sort((a, b) => a.localeCompare(b));

        setExercisesByGroup(byGroup);
        setMuscleGroups(groups);

        // If current selection no longer exists, reset it.
        if (selectedMuscleGroup && !byGroup[selectedMuscleGroup]) {
          setSelectedMuscleGroup('');
          setSelectedExercise('');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMessage(
          `Nie udało się pobrać listy ćwiczeń z API. Upewnij się, że backend działa. (${err?.message || 'error'})`
        );
        setShowErrorAlert(true);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingExercises(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedMuscleGroup]);

  const availableExercises = useMemo(() => {
    return selectedMuscleGroup ? exercisesByGroup[selectedMuscleGroup] || [] : [];
  }, [selectedMuscleGroup, exercisesByGroup]);

  const handleAdd = async () => {
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

    setIsAdding(true);
    setShowErrorAlert(false);
    setErrorMessage('');

    try {
      let exerciseId = null;
      let exerciseName = null;

      if (isCustomExercise) {
        exerciseName = customExerciseName.trim();
        try {
          const created = await createExercise({
            name: exerciseName,
            muscle_group: selectedMuscleGroup,
            note: notes.trim() || null,
          });
          exerciseId = created?.id != null ? Number(created.id) : null;
        } catch (e) {
          const rows = await listExercises();
          const found = (rows || []).find(
            (r) => (r?.name || '').toLowerCase() === exerciseName.toLowerCase()
          );
          if (!found?.id) throw e;
          exerciseId = Number(found.id);
        }
      } else {
        exerciseId = Number(selectedExercise);
        const exObj = availableExercises.find((e) => String(e.id) === String(selectedExercise));
        exerciseName = exObj?.name;
      }

      if (!exerciseId || !exerciseName) {
        throw new Error('Nie udało się ustalić exercise_id');
      }

      const newExercise = {
        id: Date.now(),
        muscleGroup: selectedMuscleGroup,
        exerciseId,
        exercise: exerciseName,
        isCustom: isCustomExercise,
        weight: weightNum,
        reps: repsNum,
        sets: setsNum,
        series: series,
        notes: notes.trim(),
      };

      onAdd(newExercise);

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
    } catch (e) {
      const msg = e?.message || 'Failed to add exercise';
      setErrorMessage(msg);
      setShowErrorAlert(true);
    } finally {
      setIsAdding(false);
    }
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
                disabled={isLoadingExercises}
              >
                <option value="">
                  {isLoadingExercises ? 'Ładowanie...' : 'Wybierz grupę mięśni'}
                </option>
                {muscleGroups.map((group) => (
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
                  disabled={!selectedMuscleGroup || isLoadingExercises}
                >
                  <option value="">Wybierz ćwiczenie</option>
                  {availableExercises.map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </option>
                  ))}
                </select>
                <button 
                  className="add-custom-exercise-btn"
                  onClick={() => setIsCustomExercise(true)}
                  disabled={!selectedMuscleGroup || isLoadingExercises}
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
            <button type="button" className="add-exercise-cancel-btn" onClick={handleCancel} disabled={isAdding}>
              Anuluj
            </button>
            <button type="button" className="add-exercise-add-btn" onClick={handleAdd} disabled={isAdding}>
              {isAdding ? 'Dodaj...' : 'Dodaj'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddExerciseModal;
