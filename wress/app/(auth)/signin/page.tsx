"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { Eye, EyeOff } from "lucide-react"

const API_BASE_URL = "http://localhost:5000/api/auth"

type SignedInUser = {
  id: number
  first_name: string
  last_name: string
  full_name: string
  email: string
  user_type: "System Admin" | "Organization Admin" | "Stakeholder"
}

function SignInContent() {
  const router = useRouter()
  const { login } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")

  const [showPassword, setShowPassword] = useState(false)

  const getRedirectPathByUserType = (user_type: string) => {
    switch (user_type) {
      case "System Admin":
        return "/sys-admin/dashboard"
      case "Organization Admin":
        return "/org-admin/dashboard"
      case "Stakeholder":
        return "/stakeholder/dashboard"
      default:
        return "/signin"
    }
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")

    try {
      const response = await fetch(`${API_BASE_URL}/signin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.message || data.error || "Sign in failed.")
        return
      }

      const user: SignedInUser | undefined = data.user

      if (!user) {
        setMessage("User data was not returned.")
        return
      }

      if (data.token) {
        localStorage.setItem('token', data.token)
      } else {
        console.error("No token received from server")
        setMessage("Authentication failed. Please try again.")
        return
      }

      login(user)

      const redirectPath = getRedirectPathByUserType(user.user_type)

      if (redirectPath === "/signin") {
        setMessage("No dashboard is available for your role yet.")
        return
      }

      router.push(redirectPath)
    } catch (error) {
      console.error("Sign in error:", error)
      setMessage("Unable to connect to the server.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 p-6">
      <div className="w-full max-w-md">

        {/* Card */}
        <div className="rounded-2xl bg-card shadow-xl ring-1 ring-border/60 p-8 space-y-6">

          

          {/* Title */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-semibold text-foreground">
              Sign in
            </h1>
            <p className="text-sm text-muted-foreground">
              Welcome back! Enter your credentials.
            </p>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSignIn}>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Email</label>
              <input
                type="email"
                className="h-11 w-full rounded-lg bg-background ring-1 ring-border px-3 outline-none focus:ring-2 focus:ring-brand transition"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">Password</label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground hover:text-brand"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="h-11 w-full rounded-lg bg-background ring-1 ring-border px-3 pr-16 outline-none focus:ring-2 focus:ring-brand transition"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-brand"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Error message */}
            {message && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2">
                <p className="text-sm text-red-700">{message}</p>
              </div>
            )}

            {/* Button */}
            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-lg bg-brand text-background font-semibold hover:bg-brand/90 transition disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Footer */}
          <div className="text-center space-y-2">
            

            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} WRESS
            </p>
          </div>

        </div>
      </div>
    </main>
  )
}

export default function SignInPage() {
  return (
    <AuthProvider>
      <SignInContent />
    </AuthProvider>
  )
}