'use client'
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import api from './api'

const AuthContext = createContext(null)

export const useAuth = () => useContext(AuthContext)

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me')
      setUser(data)
      return data
    } catch (e) {
      setUser(null)
      return null
    }
  }, [])

  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('ss_token') : null
    setToken(t)
    if (t) fetchMe().finally(() => setLoading(false))
    else setLoading(false)
  }, [fetchMe])

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('ss_token', data.access_token)
    setToken(data.access_token)
    await fetchMe()
    return data
  }

  const register = async (email, password) => {
    const { data } = await api.post('/auth/register', { email, password })
    localStorage.setItem('ss_token', data.access_token)
    setToken(data.access_token)
    await fetchMe()
    return data
  }

  const loginWithGoogle = async (credential) => {
    const { data } = await api.post('/auth/google', { credential })
    localStorage.setItem('ss_token', data.access_token)
    setToken(data.access_token)
    await fetchMe()
    return data
  }

  const logout = () => {
    localStorage.removeItem('ss_token')
    setToken(null)
    setUser(null)
    if (typeof window !== 'undefined') window.location.href = '/auth'
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, loginWithGoogle, logout, refreshUser: fetchMe }}>
      {children}
    </AuthContext.Provider>
  )
}
