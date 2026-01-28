import React from 'react';
import '../styles/components/Statistics.css';

const Statistics = () => {
  // Пример статистики
  const stats = [
    { label: 'Wszystkie treningi', value: '24' },
    { label: 'Treningi w tym miesiącu', value: '8' },
    { label: 'Średni czas trwania', value: '45 min' },
    { label: 'Ulubione ćwiczenie', value: 'Wyciskanie leżąc' },
  ];

  return (
    <div className="statistics">
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-item">
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Statistics;

