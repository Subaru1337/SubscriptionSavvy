import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Header from '../components/Header';
import Dashboard from '../components/Dashboard';
import Subscriptions from '../components/Subscriptions';
import Reminders from '../components/Reminders'; 

const HomePage = () => {
  return (
    <div className="app-layout">
      <Header />
      <main className="app-content">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/subscriptions" element={<Subscriptions />} />
          <Route path="/reminders" element={<Reminders />} />
          {/* Default route for home */}
          <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
      </main>
    </div>
  );
};

export default HomePage;