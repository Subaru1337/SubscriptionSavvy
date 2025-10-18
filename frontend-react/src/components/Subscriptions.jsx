import React, { useState, useEffect } from 'react';
import * as api from '../api/apiClient';
import SubscriptionModal from './SubscriptionModal';

const Subscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState(null);

  const fetchSubscriptions = async () => {
    try {
      const { data } = await api.getSubscriptions();
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

  const handleAdd = () => {
    setEditingSub(null);
    setIsModalOpen(true);
  };

  const handleEdit = (sub) => {
    setEditingSub(sub);
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this subscription?')) {
      await api.deleteSubscription(id);
      fetchSubscriptions();
    }
  };

  const handleSave = () => {
    setIsModalOpen(false);
    fetchSubscriptions();
  };

  if (loading) return <div>Loading subscriptions...</div>;

  return (
    <div className="subscriptions-page">
      <div className="page-header">
        <h2>Your Subscriptions</h2>
        <button onClick={handleAdd}>+ Add Subscription</button>
      </div>

      <div className="subscription-list">
      {subscriptions.map((sub) => (
    <div key={sub.id} className="subscription-item">
      {/* START: Updated Structure */}
      <div className="sub-info">
        <strong className="sub-name">{sub.name}</strong>
        <div className="sub-meta">
          <span className="sub-category">{sub.category}</span>
          <span className="sub-next-payment">Next payment: {sub.next_payment}</span>
        </div>
      </div>
      {/* END: Updated Structure */}

      <div className="sub-cost">
        ₹{sub.cost.toFixed(2)} / {sub.billing_cycle}
      </div>
      <div className="sub-actions">
        <button onClick={() => handleEdit(sub)}>Edit</button>
        <button onClick={() => handleDelete(sub.id)} className="delete">Delete</button>
      </div>
    </div>
            
        ))}
      </div>

      {isModalOpen && (
        <SubscriptionModal
          sub={editingSub}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default Subscriptions;