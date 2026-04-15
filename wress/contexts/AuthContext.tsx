// contexts/AuthContext.tsx
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

// Define the user type (match your backend response)
type SignedInUser = {
  id: number
  first_name: string
  last_name: string
  full_name: string
  email: string
  user_type: "System Admin" | "Organization Admin" | "Stakeholder"
}

// Define what the context will provide
interface AuthContextType {
  user: SignedInUser | null
  userId: number | null
  isLoading: boolean
  login: (userData: SignedInUser) => void
  logout: () => void
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Create the provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SignedInUser | null>(null)
  const [userId, setUserId] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load saved user data when the app starts
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser && storedUser !== 'undefined') {
      try {
        const userData = JSON.parse(storedUser)
        setUser(userData)
        setUserId(userData.id)
      } catch (error) {
        console.error('Failed to parse user data', error)
        localStorage.removeItem('user')
      }
    }
    setIsLoading(false)
  }, [])

  // Login function - saves user data
  const login = (userData: SignedInUser) => {
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    setUserId(userData.id)
  }

  // Logout function - removes user data
  const logout = () => {
    localStorage.removeItem('user')
    setUser(null)
    setUserId(null)
  }

  return (
    <AuthContext.Provider value={{ user, userId, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use auth anywhere
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}