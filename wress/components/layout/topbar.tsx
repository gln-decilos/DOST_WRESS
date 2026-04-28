"use client"

import { Bell, Search, Settings, User, Menu, LogOut } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
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
const API_BASE_URL = "http://localhost:5000/api"

export function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter()

  const [q, setQ] = useState("")
  const [user, setUser] = useState<AuthUser | null>(null)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications`, {
        method: "GET",
        credentials: "include",
      })

      if (!response.ok) return

      const data = await response.json()
      setNotifications(data.notifications || [])
      setUnreadCount(data.unread_count || 0)
    } catch (error) {
      console.error("Failed to load notifications:", error)
    }
  }

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch(`${AUTH_API_BASE_URL}/me`, {
          method: "GET",
          credentials: "include",
        })

        if (!response.ok) return

        const data = await response.json()
        setUser(data.user)
      } catch (error) {
        console.error("Failed to load current user:", error)
      }
    }

    fetchCurrentUser()
    fetchNotifications()

    const interval = window.setInterval(fetchNotifications, 15000)

    return () => window.clearInterval(interval)
  }, [])

  const initials = useMemo(() => {
    if (!user) return "U"

    const first = user.first_name?.charAt(0) || ""
    const last = user.last_name?.charAt(0) || ""

    return `${first}${last}`.toUpperCase() || "U"
  }, [user])

  const profileHref = useMemo(() => {
    const roleNames = user?.roles?.map((role) => role.name) || []

    if (roleNames.includes("Administrator")) return "/admin/profile"
    if (roleNames.includes("Business Analyst")) return "/business-analyst/profile"

    return "/profile"
  }, [user])

  const handleNotificationClick = async (notification: NotificationItem) => {
    try {
      await fetch(`${API_BASE_URL}/notifications/${notification.id}/read`, {
        method: "PATCH",
        credentials: "include",
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
      await fetch(`${API_BASE_URL}/notifications/read-all`, {
        method: "PATCH",
        credentials: "include",
      })

      await fetchNotifications()
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error)
    }
  }

  const handleLogout = async () => {
    try {
      const response = await fetch(`${AUTH_API_BASE_URL}/signout`, {
        method: "POST",
        credentials: "include",
      })

      if (!response.ok) {
        console.error("Failed to sign out:", response.status)
        return
      }

      router.push("/signin")
      router.refresh()
    } catch (error) {
      console.error("Failed to logout:", error)
    }
  }

  return (
    <header className="sticky top-0 z-30 mb-6 rounded-xl border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 lg:-mx-7 lg:rounded-none">
      <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-7">
        <button
          onClick={onMenuClick}
          className="rounded-full p-2 hover:bg-muted focus:outline-none focus:ring-2 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="size-5" />
        </button>

        <div className="max-w-xl flex-1">
          <label className="relative block">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Search className="size-4" />
            </span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search here"
              className="w-full rounded-full border bg-background py-2 pl-9 pr-3 text-sm"
              aria-label="Search"
            />
          </label>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu onOpenChange={(open) => open && fetchNotifications()}>
            <DropdownMenuTrigger className="relative rounded-full p-2 hover:bg-muted focus:outline-none focus:ring-2">
              <Bell className="size-5" aria-hidden />
              <span className="sr-only">Open notifications</span>

              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between px-2 py-1.5">
                <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>

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
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No notifications yet
                </div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className="flex cursor-pointer flex-col items-start gap-1 whitespace-normal"
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <p className="text-sm font-medium">{notification.title}</p>

                      {!notification.is_read && (
                        <span className="mt-1 size-2 rounded-full bg-red-500" />
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {notification.message}
                    </p>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-full p-2 hover:bg-muted focus:outline-none focus:ring-2">
              <Settings className="size-5" aria-hidden />
              <span className="sr-only">Open settings</span>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <button className="w-full text-left">Manage users</button>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <button className="w-full text-left">Network</button>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <ThemeToggle />
              </div>
              <div className="px-2 pb-2">
                <ColorThemePicker />
              </div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-full p-1.5 hover:bg-muted focus:outline-none focus:ring-2">
              <Avatar className="size-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <span className="sr-only">Open user menu</span>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex items-center gap-2">
                <User className="size-4" />
                {user ? `Signed in as ${user.full_name}` : "Signed in"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href={profileHref}>Profile</a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2 text-destructive"
              >
                <LogOut className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}