import React, { useState, useRef } from 'react';
import WorkoutHistory from './WorkoutHistory';
import Records from './Records';
import Statistics from './Statistics';
import CreateWorkoutModal from './CreateWorkoutModal';
import { saveWorkout } from '../utils/storage';
import '../styles/components/MainScreen.css';

const MainScreen = () => {
  const userName = 'Użytkownik';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const workoutHistoryRef = useRef(null);

  const handleAddWorkout = () => {
    setIsModalOpen(true);
  };

  const handleSaveWorkout = (workout) => {
    saveWorkout(workout);
    // Reload workout history after a short delay to ensure state updates
    setTimeout(() => {
      if (workoutHistoryRef.current) {
        workoutHistoryRef.current.reload();
      }
    }, 100);
  };

  return (
    <div className="main-screen">
      {/* Header */}
      <header className="main-header">
        <div className="logo">Workoutlog</div>
        <div className="user-name">{userName}</div>
      </header>

      {/* Main Content */}
      <div className="main-content">
        <div className="content-row">
          <div className="content-block">
            <h2 className="block-title">Records</h2>
            <Records />
          </div>
          <div className="content-block">
            <h2 className="block-title">Historia treningów</h2>
            <WorkoutHistory ref={workoutHistoryRef} />
          </div>
        </div>
        <div className="content-row">
          <div className="content-block full-width">
            <h2 className="block-title">Statystyki</h2>
            <Statistics />
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button className="fab" onClick={handleAddWorkout} aria-label="Dodaj trening">
        <span className="fab-icon">+</span>
      </button>

      {/* Модальное окно */}
      <CreateWorkoutModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveWorkout}
      />
    </div>
  );
};

export default MainScreen;

