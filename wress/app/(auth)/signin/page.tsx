"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"

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
      console.log("SIGNIN RESPONSE:", data)
      console.log("STATUS:", response.status)

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
        console.log("Token stored successfully")
      } else {
        console.error("No token received from server")
        setMessage("Authentication failed. Please try again.")
        return
      }

      login(user)
      console.log("User signed in successfully. ID saved:", user.id)

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
    <main className="min-h-[80dvh] flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 ring-1 ring-border">
        <h1 className="text-2xl font-semibold text-foreground mb-2 text-balance">
          Sign in
        </h1>

        <p className="text-sm text-muted-foreground mb-6">
          Welcome back. Enter your credentials.
        </p>

        <form className="grid gap-4" onSubmit={handleSignIn}>
          <label className="grid gap-2">
            <span className="text-sm text-muted-foreground">Email</span>
            <input
              type="email"
              className="h-10 rounded-md bg-background ring-1 ring-border px-3 outline-none focus:ring-2 focus:ring-brand"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm text-muted-foreground">Password</span>
            <input
              type="password"
              className="h-10 rounded-md bg-background ring-1 ring-border px-3 outline-none focus:ring-2 focus:ring-brand"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          {message && (
            <p className="text-sm text-red-500 bg-red-50 p-2 rounded-md">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-10 rounded-md bg-brand text-background disabled:opacity-50 hover:bg-brand/90 transition-colors"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-4 mb-3 text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link href="/signup" className="text-brand hover:underline">
            Sign up
          </Link>
        </p>
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