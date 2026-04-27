'use client'
import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('ss_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (typeof window !== 'undefined' && err?.response?.status === 401) {
      const path = window.location.pathname
      if (path !== '/auth' && path !== '/') {
        localStorage.removeItem('ss_token')
        window.location.href = '/auth'
      }
    }
    return Promise.reject(err)
  }
)

export default api
