import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userType, setUserType] = useState(null)
  const [loading, setLoading] = useState(true)

  // Function to check and update auth from localStorage
  const checkAuth = () => {
    const token = localStorage.getItem('authToken')
    const storedUserType = localStorage.getItem('userType')
    const email = localStorage.getItem('email')
    
    if (token && storedUserType && email) {
      setUser({ email })
      setUserType(storedUserType)
    } else {
      setUser(null)
      setUserType(null)
    }
  }

  useEffect(() => {
    // Initial check on mount
    checkAuth()
    setLoading(false)

    // Listen for storage changes (login/logout in same or different tab)
    const handleStorageChange = (e) => {
      if (e.key === 'authToken' || e.key === 'userType' || e.key === 'email') {
        checkAuth()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const logout = () => {
    setUser(null)
    setUserType(null)
    localStorage.removeItem('authToken')
    localStorage.removeItem('userType')
    localStorage.removeItem('email')
    localStorage.removeItem('district')
  }

  return (
    <AuthContext.Provider value={{ user, userType, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
