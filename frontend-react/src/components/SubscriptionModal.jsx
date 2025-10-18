// src/components/SubscriptionModal.jsx

import React, { useState, useEffect } from 'react';
import * as api from '../api/apiClient';

const categories = [
  "Entertainment", "Productivity & Software", "Gaming", "Shopping & Memberships",
  "Fitness & Health", "Education & Learning", "Finance & Utilities",
  "Cloud & Storage", "News & Reading", "Others"
];

const SubscriptionModal = ({ sub, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    cost: '',
    category: 'Others',
    billing_cycle: 'monthly',
    // We'll rename this field to reflect its new purpose
    first_payment_date: '', 
    notes: '',
  });

  useEffect(() => {
    if (sub) {
      setFormData({
        name: sub.name,
        cost: sub.cost,
        category: sub.category,
        billing_cycle: sub.billing_cycle,
        // When editing, we still work with the existing next_payment date
        first_payment_date: sub.next_payment, 
        notes: sub.notes || '',
      });
    }
  }, [sub]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };

      // Rename first_payment_date to next_payment for clarity in the payload
      payload.next_payment = payload.first_payment_date;
      delete payload.first_payment_date;

      if (sub) {
        // --- START: New Edit Logic ---
        // Check if the user has changed the billing cycle
        if (sub.billing_cycle !== payload.billing_cycle) {
          
          // If it changed, we must recalculate the next payment date
          // based on the date currently in the form.
          const [year, month, day] = payload.next_payment.split('-').map(Number);
          const newNextPayment = new Date(year, month - 1, day);

          if (payload.billing_cycle === 'yearly') {
            // This handles the user's specific case: monthly to yearly
            newNextPayment.setFullYear(newNextPayment.getFullYear() + 1);
          } else if (payload.billing_cycle === 'monthly') {
            // This handles changing from yearly to monthly
            newNextPayment.setMonth(newNextPayment.getMonth() + 1);
          }

          // Format the newly calculated date back to 'YYYY-MM-DD'
          const finalYear = newNextPayment.getFullYear();
          const finalMonth = String(newNextPayment.getMonth() + 1).padStart(2, '0');
          const finalDay = String(newNextPayment.getDate()).padStart(2, '0');
          payload.next_payment = `${finalYear}-${finalMonth}-${finalDay}`;
        }
        // If the billing cycle did NOT change, the date from the form is used as-is.
        // --- END: New Edit Logic ---

        await api.updateSubscription(sub.id, payload);

      } else {
        // ... (The creation logic is already correct and remains unchanged)
        const [year, month, day] = payload.next_payment.split('-').map(Number);
        const nextPayment = new Date(year, month - 1, day);

        if (payload.billing_cycle === 'monthly') {
          nextPayment.setMonth(nextPayment.getMonth() + 1);
        } else if (payload.billing_cycle === 'yearly') {
          nextPayment.setFullYear(nextPayment.getFullYear() + 1);
        }
        
        const finalYear = nextPayment.getFullYear();
        const finalMonth = String(nextPayment.getMonth() + 1).padStart(2, '0');
        const finalDay = String(nextPayment.getDate()).padStart(2, '0');
        payload.next_payment = `${finalYear}-${finalMonth}-${finalDay}`;
        
        await api.createSubscription(payload);
      }

      onSave();
    } catch (error) {
      console.error('Failed to save subscription:', error);
      alert('Failed to save. Check the console for details.');
    }

  
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>{sub ? 'Edit Subscription' : 'Add New Subscription'}</h2>
        <form onSubmit={handleSubmit}>
          <input name="name" value={formData.name} onChange={handleChange} placeholder="Name (e.g., Netflix)" required />
          <input name="cost" type="number" value={formData.cost} onChange={handleChange} placeholder="Cost" required />
          <select name="category" value={formData.category} onChange={handleChange}>
            {categories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
          </select>
          <select name="billing_cycle" value={formData.billing_cycle} onChange={handleChange}>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          
          {/* Change the input name and label */}
          <label htmlFor="first_payment_date">{sub ? 'Next Payment Date' : 'First Payment Date'}</label>
          <input id="first_payment_date" name="first_payment_date" type="date" value={formData.first_payment_date} onChange={handleChange} required />
          
          <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Notes..." />
          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button type="submit">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubscriptionModal;