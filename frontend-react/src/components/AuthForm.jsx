import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../api/apiClient';

const AuthForm = ({ isLogin, setIsLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await api.registerUser({ email, password });
        setMessage('Registration successful! Please sign in.');
        setIsLogin(true); // Switch to login form after registration
      }
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred.');
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-icon">👤</div>
      <h2>{isLogin ? 'Welcome back' : 'Create account'}</h2>
      <p>{isLogin ? 'Sign in to manage your subscriptions' : 'Start tracking your subscriptions today'}</p>

      <form onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />
        </div>
        <div className="input-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            required
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        {message && <p className="success-message">{message}</p>}
        <button type="submit" className="auth-button">
          {isLogin ? 'Sign in' : 'Create account'} →
        </button>
      </form>

      <p className="auth-switch">
        {isLogin ? "Don't have an account?" : 'Already have an account?'}
        <button onClick={() => setIsLogin(!isLogin)} className="link-button">
          {isLogin ? 'Sign up' : 'Sign in'}
        </button>
      </p>
    </div>
  );
};

export default AuthForm;