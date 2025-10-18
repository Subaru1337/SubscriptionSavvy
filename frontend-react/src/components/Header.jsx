import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { NavLink } from 'react-router-dom';
import * as api from '../api/apiClient';

const Header = () => {
  const { user, logout } = useAuth();
  const [exporting, setExporting] = useState(false);

  const handleExport = async (type) => {
    setExporting(true);
    try {
      const response = type === 'csv' ? await api.exportToCSV() : await api.exportToPDF();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `subscriptions.${type}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <header className="app-header">
      <div className="logo">
        <span className="logo-icon">₹</span> SubscriptionSavvy
      </div>
      <nav className="main-nav">
        <NavLink to="/dashboard">Dashboard</NavLink>
        <NavLink to="/subscriptions">Subscriptions</NavLink>
        <NavLink to="/reminders">Reminders</NavLink>
        <div className="export-menu">
          <button className="export-button" disabled={exporting}>
            {exporting ? 'Exporting...' : 'Export ▾'}
          </button>
          <div className="export-dropdown">
            <button onClick={() => handleExport('csv')}>Export as CSV</button>
            <button onClick={() => handleExport('pdf')}>Export as PDF</button>
          </div>
        </div>
      </nav>
      <div className="user-info">
        <span>{user?.email}</span>
        <button onClick={logout} className="logout-button">
          Sign Out
        </button>
      </div>
    </header>
    
  );
};

export default Header;