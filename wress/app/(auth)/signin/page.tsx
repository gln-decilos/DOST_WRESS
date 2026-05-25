"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { AuthProvider, useAuth } from "@/contexts/AuthContext"
import { ArrowLeft, Eye, EyeOff, LockKeyhole } from "lucide-react"

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
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
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
        localStorage.setItem("token", data.token)
      } else {
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-10">
      <div
        className="absolute left-1/2 top-[-120px] h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-[140px] opacity-30"
        style={{ backgroundColor: "var(--brand)" }}
      />

      <div
        className="absolute left-[-160px] top-1/4 h-[420px] w-[420px] rounded-full blur-[130px] opacity-15"
        style={{ backgroundColor: "var(--brand)" }}
      />

      <div
        className="absolute right-[-160px] bottom-1/4 h-[420px] w-[420px] rounded-full blur-[130px] opacity-15"
        style={{ backgroundColor: "var(--brand)" }}
      />

      <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklab,var(--brand)_12%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklab,var(--brand)_12%,transparent)_1px,transparent_1px)] bg-[size:64px_64px] opacity-35" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,transparent_45%,hsl(var(--background))_100%)]" />

      <div className="absolute left-10 top-20 hidden h-24 w-24 rotate-12 rounded-3xl border border-brand/20 bg-card/40 backdrop-blur md:block" />

      <div className="absolute right-16 top-32 hidden h-16 w-16 -rotate-12 rounded-2xl border border-brand/20 bg-card/40 backdrop-blur lg:block" />

      <div className="absolute bottom-24 left-1/4 hidden h-20 w-20 rounded-full border border-brand/20 bg-card/40 backdrop-blur md:block" />

      <div className="absolute bottom-16 right-1/4 hidden h-28 w-28 rotate-6 rounded-3xl border border-brand/20 bg-card/40 backdrop-blur lg:block" />

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-3xl border border-border/70 bg-card/95 p-8 shadow-2xl shadow-black/5 backdrop-blur space-y-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-brand"
          >
            <ArrowLeft className="size-4" />
            Back to landing page
          </Link>


          <div className="text-center space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">
              Sign in to WRESS
            </h1>
            <p className="text-sm text-muted-foreground">
              Access your requirements engineering workspace.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSignIn}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                type="email"
                className="h-11 w-full rounded-xl bg-background ring-1 ring-border px-3 outline-none transition focus:ring-2 focus:ring-brand"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-muted-foreground transition hover:text-brand"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="h-11 w-full rounded-xl bg-background ring-1 ring-border px-3 pr-12 outline-none transition focus:ring-2 focus:ring-brand"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-brand"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {message && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
                <p className="text-sm text-red-700">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-brand font-semibold text-white transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            © {new Date().getFullYear()} WRESS
          </p>
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