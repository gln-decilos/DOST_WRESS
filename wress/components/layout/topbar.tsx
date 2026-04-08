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

const API_BASE_URL = "http://localhost:5000/api/auth"

export function Topbar({ onMenuClick }: TopbarProps) {
  const router = useRouter()
  const [q, setQ] = useState("")
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/me`, {
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

  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/logout`, {
        method: "POST",
        credentials: "include",
      })

      if (!response.ok) return

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
          <DropdownMenu>
            <DropdownMenuTrigger className="relative rounded-full p-2 hover:bg-muted focus:outline-none focus:ring-2">
              <Bell className="size-5" aria-hidden />
              <span className="sr-only">Open notifications</span>
              <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white">
                3
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Washer cycle completed</DropdownMenuItem>
              <DropdownMenuItem>Front door locked</DropdownMenuItem>
              <DropdownMenuItem>HVAC filter reminder</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-muted-foreground">
                View all
              </DropdownMenuItem>
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