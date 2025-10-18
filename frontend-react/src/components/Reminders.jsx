// src/components/Reminders.jsx

import React, { useState, useEffect } from 'react';
import * as api from '../api/apiClient';

// Helper function to calculate the status of a subscription
const getSubscriptionStatus = (nextPaymentDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
  
    const [year, month, day] = nextPaymentDate.split('-').map(Number);
    const paymentDate = new Date(year, month - 1, day);
    paymentDate.setHours(0, 0, 0, 0);
  
    const diffTime = paymentDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
    if (diffDays < 0) {
      return { text: 'Overdue', className: 'tag-overdue' };
    }
    if (diffDays === 0) {
      return { text: 'Due Today', className: 'tag-today' };
    }
    // START: New condition for tomorrow's date
    if (diffDays === 1) {
      return { text: 'Tomorrow', className: 'tag-tomorrow' };
    }
    // END: New condition
    if (diffDays <= 7) {
      return { text: 'Within a week', className: 'tag-due-soon' };
    }
    return { text: 'Upcoming', className: 'tag-upcoming' };
  };


const Reminders = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptions = async () => {
    try {
      const { data } = await api.getSubscriptions();
      // Sort by next payment date, ascending
      data.sort((a, b) => new Date(a.next_payment) - new Date(b.next_payment));
      setSubscriptions(data);
    } catch (error) {
      console.error("Failed to fetch subscriptions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleMarkAsPaid = async (subId) => {
    try {
      // Use the new, correct function from our apiClient
      await api.markSubscriptionAsPaid(subId);
      
      // Refresh the list to show the updated date
      fetchSubscriptions();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update payment.');
      console.error("Failed to mark as paid:", error);
    }
  };


  if (loading) return <div>Loading reminders...</div>;

  return (
    <div className="reminders-page">
      <div className="page-header">
        <h2>Reminders</h2>
      </div>
      <div className="reminders-list">
        {subscriptions.map((sub) => {
          const status = getSubscriptionStatus(sub.next_payment);
          return (
            <div key={sub.id} className="reminder-item">
              <div className="sub-info">
                <strong className="sub-name">{sub.name}</strong>
                <div className="sub-meta">
                  <span className="sub-category">{sub.category}</span>
                  <span className="sub-next-payment">Next payment: {sub.next_payment}</span>
                </div>
              </div>

              <div className="reminder-actions">
                <span className={`status-tag ${status.className}`}>{status.text}</span>
                {status.className === 'tag-today' && (
                  <input
                    type="checkbox"
                    className="paid-checkbox"
                    title="Mark as paid"
                    onChange={() => handleMarkAsPaid(sub.id)}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Reminders;