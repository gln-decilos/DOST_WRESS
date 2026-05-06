"use client"

import Link from "next/link"
import { useState } from "react"

const API_BASE_URL = "http://localhost:5000/api/auth"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [success, setSuccess] = useState(false)

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage("")
    setSuccess(false)

    try {
      const response = await fetch(`${API_BASE_URL}/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.message || data.error || "Something went wrong.")
        return
      }

      setSuccess(true)
      setMessage("Password reset link has been sent to your email.")
    } catch (error) {
      console.error("Forgot password error:", error)
      setMessage("Unable to connect to the server.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-[80dvh] flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 ring-1 ring-border">

        <h1 className="text-2xl font-semibold text-foreground mb-2 text-center">
          Forgot Password
        </h1>

        <p className="text-sm text-muted-foreground mb-6 text-center">
          Enter your email and we'll send you a reset link.
        </p>

        <form className="grid gap-4" onSubmit={handleForgotPassword}>
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

          {message && (
            <div
              className={`rounded-lg p-3 border ${success
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
                }`}
            >
              <p
                className={`text-sm ${success ? "text-green-700" : "text-red-700"
                  }`}
              >
                {message}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="h-10 rounded-md bg-brand text-background disabled:opacity-50 hover:bg-brand/90 transition-colors font-semibold"
          >
            {loading ? "Sending..." : "Send Reset Link"}
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