import React, { useState, useRef } from 'react';
import WorkoutHistory from './WorkoutHistory';
import Records from './Records';
import Statistics from './Statistics';
import CreateWorkoutModal from './CreateWorkoutModal';
import '../styles/components/MainScreen.css';

const MainScreen = () => {
  const userName = 'User';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const workoutHistoryRef = useRef(null);
  const recordsRef = useRef(null);
  const statisticsRef = useRef(null);

  const handleAddWorkout = () => {
    setIsModalOpen(true);
  };

  const handleSaveWorkout = (workout) => {
    // Reload data after a short delay to ensure backend has committed everything
    setTimeout(() => {
      if (workoutHistoryRef.current) {
        workoutHistoryRef.current.reload();
      }
      if (recordsRef.current) {
        recordsRef.current.reload();
      }
      if (statisticsRef.current) {
        statisticsRef.current.reload();
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
            <Records ref={recordsRef} />
          </div>
          <div className="content-block">
            <h2 className="block-title">Workout History</h2>
            <WorkoutHistory ref={workoutHistoryRef} />
          </div>
        </div>
        <div className="content-row">
          <div className="content-block full-width">
            <h2 className="block-title">Statistics</h2>
            <Statistics ref={statisticsRef} />
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button className="fab" onClick={handleAddWorkout} aria-label="Add workout">
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

