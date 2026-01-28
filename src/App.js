import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import MainScreen from './components/MainScreen';
import CreateWorkoutScreen from './components/CreateWorkoutScreen';
import './styles/App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<MainScreen />} />
          <Route path="/create-workout" element={<CreateWorkoutScreen />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

