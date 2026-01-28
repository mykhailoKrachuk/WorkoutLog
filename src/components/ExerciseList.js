import React, { useEffect, useState } from "react";
import { api } from "../utils/api";
import "../styles/components/ExerciseList.css";

const ExerciseList = () => {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get("/exercises");
        setExercises(
          data.map((e) => ({
            id: e.id,
            name: e.name,
            category: e.muscle_group,
          }))
        );
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="exercise-list">
        <div className="empty-state">
          <p>Ładowanie…</p>
        </div>
      </div>
    );
  }

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
