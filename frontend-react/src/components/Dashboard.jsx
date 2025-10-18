// src/components/Dashboard.jsx

import React, { useState, useEffect } from 'react';
import * as api from '../api/apiClient';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Pie } from 'react-chartjs-2'; // Bar is no longer needed

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const Dashboard = () => {
    const [summary, setSummary] = useState(null);
    const [pieChartData, setPieChartData] = useState(null);
    const [categoryBreakdown, setCategoryBreakdown] = useState([]); // New state for the list
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [summaryRes, categoryRes] = await Promise.all([
                    api.getAnalyticsSummary(),
                    api.getCategoryBreakdown()
                ]);

                setSummary(summaryRes.data);
                
                // Set the raw data for our new list
                setCategoryBreakdown(categoryRes.data);

                // Prepare data for the Pie Chart
                const labels = categoryRes.data.map(c => c.category);
                const data = categoryRes.data.map(c => c.total);
                setPieChartData({
                    labels,
                    datasets: [{
                        label: 'Spending by Category',
                        data,
                        backgroundColor: ['#4A90E2', '#50E3C2', '#F5A623', '#9013FE', '#B8E986', '#F8E71C', '#D0021B'],
                    }],
                });
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return <div>Loading dashboard...</div>;

    return (
        <div className="dashboard-grid">
            <div className="stat-card">
                <h3>Monthly Total</h3>
                <p>₹{summary?.monthly_total?.toFixed(2)}</p>
            </div>
            <div className="stat-card">
                <h3>Annual Total</h3>
                <p>₹{summary?.annual_total?.toFixed(2)}</p>
            </div>
            <div className="stat-card">
                <h3>Active Subscriptions</h3>
                <p>{summary?.active_subscriptions}</p>
            </div>

            <div className="chart-card">
                <h3>Spending by Category</h3>
                <div className="chart-container">
                    {pieChartData && <Pie data={pieChartData} />}
                </div>
            </div>
            
            {/* START: This is the new Category Breakdown card */}
            <div className="chart-card">
              <h3>Category Breakdown</h3>
              <div className="category-list">
                {categoryBreakdown.length > 0 ? (
                  categoryBreakdown.map((item, index) => (
                    <div key={item.category} className="category-item">
                      <div className="category-info">
                        <span 
                          className="category-dot" 
                          style={{ backgroundColor: pieChartData.datasets[0].backgroundColor[index % pieChartData.datasets[0].backgroundColor.length] }}
                        ></span>
                        <span className="category-name">{item.category}</span>
                      </div>
                      <div className="category-stats">
                        <span className="category-total">₹{item.total.toFixed(2)}</span>
                        <span className="category-count">{item.count} subscription{item.count > 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>No category data to display.</p>
                )}
              </div>
            </div>
            {/* END: New Category Breakdown card */}
        </div>
    );
};

export default Dashboard;