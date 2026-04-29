"use client"

import { Bell, Settings, Menu, LogOut } from "lucide-react"
import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/theme-toggle"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ColorThemePicker } from "@/components/color-theme"

interface TopbarProps {
  onMenuClick?: () => void
}

type UserRole = {
  id: number
  name: string
}

type AuthUser = {
  id: number
  first_name: string
  last_name: string
  full_name: string
  email: string
  roles: UserRole[]
  user_type?: string
}

type NotificationItem = {
  id: number
  title: string
  message: string
  type: string
  link?: string | null
  is_read: boolean
  created_at?: string | null
}

const AUTH_API_BASE_URL = "http://localhost:5000/api/auth"
const NOTIF_API_BASE_URL = "http://localhost:5000/api"

export function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter()

  const [q, setQ] = useState("")
  const [user, setUser] = useState<AuthUser | null>(null)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const hasFetched = useRef(false)

  // =========================
  // FETCH USER
  // =========================
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true

    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem("token")
        if (!token) return

        const response = await fetch(`${AUTH_API_BASE_URL}/me`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem("token")
            localStorage.removeItem("user")
            router.push("/signin")
          }
          return
        }

        const data = await response.json()
        setUser(data)
      } catch (error) {
        console.error("Failed to load current user:", error)
      }
    }

    fetchCurrentUser()
  }, [router])

  // =========================
  // FETCH NOTIFICATIONS
  // =========================
  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      const response = await fetch(`${NOTIF_API_BASE_URL}/notifications`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) return

      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unread_count || 0)
    } catch (error) {
      console.error("Failed to load notifications:", error)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()

    const interval = window.setInterval(fetchNotifications, 15000)
    return () => window.clearInterval(interval)
  }, [fetchNotifications])

  // =========================
  // HANDLERS
  // =========================
  const handleNotificationClick = async (notification: NotificationItem) => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      await fetch(`${NOTIF_API_BASE_URL}/notifications/${notification.id}/read`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      await fetchNotifications()

      if (notification.link) {
        router.push(notification.link)
      }
    } catch (error) {
      console.error("Failed to open notification:", error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) return

      await fetch(`${NOTIF_API_BASE_URL}/notifications/read-all`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      await fetchNotifications()
    } catch (error) {
      console.error("Failed to mark all notifications:", error)
    }
  }

  const handleLogout = useCallback(async () => {
    try {
      const token = localStorage.getItem("token")

      if (token) {
        fetch(`${AUTH_API_BASE_URL}/signout`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }).catch(() => { })
      }
    } finally {
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      sessionStorage.clear()
      router.push("/signin")
      router.refresh()
    }
  }, [router])

  // =========================
  // UI HELPERS
  // =========================
  const initials = useMemo(() => {
    if (!user) return "U"
    return `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() || "U"
  }, [user])

  const profileHref = useMemo(() => {
    const roleNames = user?.roles?.map((r) => r.name) || []
    const userType = user?.user_type

    if (roleNames.includes("Administrator") || userType === "System Admin") {
      return "/admin/profile"
    }

    if (roleNames.includes("Business Analyst") || userType === "Organization Admin") {
      return "/business-analyst/profile"
    }

    if (roleNames.includes("Stakeholder") || userType === "Stakeholder") {
      return "/stakeholder/profile"
    }

    return "/profile"
  }, [user])

  // =========================
  // RENDER
  // =========================
  return (
    <header className="sticky top-0 z-30 mb-6 rounded-xl border-b border-border bg-background/80 backdrop-blur lg:-mx-7 lg:rounded-none">
      <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-7">

        {/* MENU */}
        <button
          onClick={onMenuClick}
          className="rounded-full p-2 hover:bg-muted lg:hidden"
        >
          <Menu className="size-5" />
        </button>

        {/* SEARCH */}
        <div className="max-w-xl flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search here"
            className="w-full rounded-full border py-2 pl-3 pr-3 text-sm"
          />
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-2">

          {/* 🔔 NOTIFICATIONS */}
          <DropdownMenu onOpenChange={(open) => open && fetchNotifications()}>
            <DropdownMenuTrigger className="relative rounded-full p-2 hover:bg-muted">
              <Bell className="size-5" />

              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 rounded-full bg-red-500 px-1 text-[10px] text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-80">
              <div className="flex justify-between px-2 py-1">
                <DropdownMenuLabel>Notifications</DropdownMenuLabel>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <DropdownMenuSeparator />

              {notifications.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  No notifications
                </div>
              ) : (
                notifications.map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className="flex cursor-pointer flex-col items-start gap-1"
                  >
                    <div className="flex w-full justify-between gap-2">
                      <span className="text-sm font-medium">{n.title}</span>

                      {!n.is_read && (
                        <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                      )}
                    </div>

                    <span className="text-xs text-muted-foreground">
                      {n.message}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* ⚙️ SETTINGS */}
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-full p-2 hover:bg-muted">
              <Settings className="size-5" />
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <ThemeToggle />
              <ColorThemePicker />
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 👤 USER */}
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-full p-1.5 hover:bg-muted">
              <Avatar className="size-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1">
                  <span className="font-medium">
                    {user ? user.full_name : "User"}
                  </span>

                  {user?.email && (
                    <span className="text-xs font-normal text-muted-foreground">
                      Signed in as {user.email}
                    </span>
                  )}
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <a href={profileHref}>Profile</a>
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive"
              >
                <LogOut className="size-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </div>
    </header>
  )
}