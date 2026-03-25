import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // On app load, check if user was already logged in
    const token = localStorage.getItem('token')
    const email = localStorage.getItem('email')
    const fullName = localStorage.getItem('fullName')
    return token ? { token, email, fullName } : null
  })

  const login = (data) => {
    localStorage.setItem('token', data.token)
    localStorage.setItem('email', data.email)
    localStorage.setItem('fullName', data.fullName)
    setUser(data)
  }

  const logout = () => {
    localStorage.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook — just a shortcut so any component can do: const { user } = useAuth()
export function useAuth() {
  return useContext(AuthContext)
}