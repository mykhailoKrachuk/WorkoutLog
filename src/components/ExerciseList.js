import React from 'react';
import '../styles/components/ExerciseList.css';

const ExerciseList = () => {
  // Пример данных
  const exercises = [
    { id: 1, name: 'Wyciskanie leżąc', category: 'Klatka piersiowa' },
    { id: 2, name: 'Przysiady', category: 'Nogi' },
    { id: 3, name: 'Martwy ciąg', category: 'Plecy' },
    { id: 4, name: 'Podciąganie', category: 'Plecy' },
    { id: 5, name: 'Wyciskanie nogami', category: 'Nogi' },
  ];

  return (
    <div className="exercise-list">
      {exercises.length === 0 ? (
        <div className="empty-state">
          <p>Brak ćwiczeń</p>
        </div>
      ) : (
        <ul className="exercise-list-items">
          {exercises.map((exercise) => (
            <li key={exercise.id} className="exercise-item">
              <div className="exercise-name">{exercise.name}</div>
              <div className="exercise-category">{exercise.category}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ExerciseList;

