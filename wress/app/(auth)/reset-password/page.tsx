"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { useState } from "react"
import Link from "next/link"

const API_BASE_URL = "http://localhost:5000/api/auth"

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [success, setSuccess] = useState(false)

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setMessage("")
    setSuccess(false)

    if (!token) {
      setMessage("Invalid or missing reset token.")
      return
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.")
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${API_BASE_URL}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          new_password: password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.error || data.message || "Reset failed.")
        return
      }

      setSuccess(true)
      setMessage("Password updated successfully!")

      setTimeout(() => {
        router.push("/signin")
      }, 1500)

    } catch (error) {
      console.error("Reset password error:", error)
      setMessage("Unable to connect to the server.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-[80dvh] flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 ring-1 ring-border">

        <h1 className="text-2xl font-semibold text-center mb-2">
          Reset Password
        </h1>

        <p className="text-sm text-muted-foreground text-center mb-6">
          Enter your new password below.
        </p>

        <form className="grid gap-4" onSubmit={handleResetPassword}>

          <label className="grid gap-2">
            <span className="text-sm text-muted-foreground">New Password</span>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="h-10 w-full rounded-md bg-background ring-1 ring-border px-3 pr-16 outline-none focus:ring-2 focus:ring-brand"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground hover:text-foreground"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          <label className="grid gap-2">
            <span className="text-sm text-muted-foreground">Confirm Password</span>

            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                className="h-10 w-full rounded-md bg-background ring-1 ring-border px-3 pr-16 outline-none focus:ring-2 focus:ring-brand"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
          </label>

          {message && (
            <div
              className={`rounded-lg p-3 border ${success
                ? "bg-green-50 border-green-200 text-green-700"
                : "bg-red-50 border-red-200 text-red-700"
                }`}
            >
              <p className="text-sm">{message}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-10 rounded-md bg-brand text-background disabled:opacity-50 hover:bg-brand/90 transition-colors font-semibold"
          >
            {loading ? "Updating..." : "Reset Password"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/signin"
            className="text-sm text-muted-foreground hover:text-brand"
          >
            Back to Sign in
          </Link>
        </div>

      </div>
    </main>
  )
}