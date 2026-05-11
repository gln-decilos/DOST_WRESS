"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Hash,
  Layers,
  Shield,
  UserCheck,
  Users,
  History,
  Eye,
  ThumbsUp,
  AlertCircle,
  FileText,
  Settings,
} from "lucide-react"

const API_BASE_URL = "http://localhost:5000/api/profile"

type ProfileResponse = {
  user: {
    first_name: string
    last_name: string
    email: string
  }
  organizations: {
    id: number
    name: string
  }[]
  projects: {
    project_id: number
    project_name: string
    status: string
    roles: {
      role_id: number
      role_name: string
    }[]
  }[]
}

export default function ProfilePage() {
  const router = useRouter()
  const [activeProject] = useState("PRJ-2025-001")
  const [profile, setProfile] = useState<ProfileResponse | null>(null)

  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token")

        const res = await fetch(`${API_BASE_URL}/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const data = await res.json()

        if (!res.ok) {
          console.error(data.message)
          return
        }

        setProfile(data)
      } catch (err) {
        console.error("Failed to fetch profile:", err)
      }
    }

    fetchProfile()
  }, [])

  const user = profile?.user
  const org = profile?.organizations?.[0]
  const projects = profile?.projects ?? []

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-8">

        {/* HEADER */}
        <div className="rounded-2xl border bg-card p-6 md:p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-2xl font-semibold">User Profile</h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Requirements Engineering workspace identity and activity tracking
              </p>
            </div>

            <Button variant="outline" size="sm" className="gap-2">
              <Shield className="h-4 w-4" />

              Security Status

              <Badge variant="secondary">
                Active
              </Badge>
            </Button>
          </div>
        </div>

        <Tabs defaultValue="general" className="space-y-6">

          <TabsList className="w-full justify-start border-b bg-transparent p-0">
            <TabsTrigger value="general">
              General
            </TabsTrigger>

            <TabsTrigger value="activity">
              Activity
            </TabsTrigger>

            <TabsTrigger value="projects">
              Projects
            </TabsTrigger>

            <TabsTrigger value="settings">
              Settings
            </TabsTrigger>
          </TabsList>

          {/* GENERAL */}
          <TabsContent value="general" className="space-y-6">

            <div className="grid gap-6 md:grid-cols-2">

              {/* ACCOUNT CARD */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />

                    Account Identity
                  </CardTitle>

                  <CardDescription>
                    User role and organization context
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-lg font-semibold">
                      {user?.first_name?.[0] || "U"}
                      {user?.last_name?.[0] || ""}
                    </AvatarFallback>
                  </Avatar>

                  <div>
                    <p className="text-lg font-semibold">
                      {user
                        ? `${user.first_name} ${user.last_name}`
                        : "Loading..."}
                    </p>

                    <p className="text-sm text-muted-foreground">
                      {user?.email || "Loading..."}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge>
                        {org?.name || "No Organization"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* WORKSPACE CARD */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hash className="h-5 w-5" />

                    Workspace Context
                  </CardTitle>

                  <CardDescription>
                    Active project and working environment
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Active Project
                    </span>

                    <span className="font-mono">
                      {activeProject}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Team
                    </span>

                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />

                      Core RE Team
                    </span>
                  </div>

                </CardContent>
              </Card>

            </div>

          </TabsContent>

          {/* ACTIVITY */}
          <TabsContent value="activity">

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />

                  Requirement Activity Log
                </CardTitle>

                <CardDescription>
                  Traceability of user actions in requirements engineering lifecycle
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">

                {[
                  {
                    icon: Eye,
                    text: "Reviewed REQ-1342",
                    desc: "Authentication security requirements",
                    time: "2h ago"
                  },
                  {
                    icon: ThumbsUp,
                    text: "Approved REQ-0891",
                    desc: "API performance requirements",
                    time: "Yesterday"
                  },
                  {
                    icon: FileText,
                    text: "Created REQ-1456",
                    desc: "Data retention compliance rule",
                    time: "Yesterday"
                  },
                  {
                    icon: AlertCircle,
                    text: "Commented REQ-0987",
                    desc: "Clarified validation rules",
                    time: "2 days ago"
                  },
                ].map((a, i) => (
                  <div
                    key={i}
                    className="flex justify-between border-b pb-3 last:border-none"
                  >
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        <a.icon className="h-4 w-4" />

                        {a.text}
                      </p>

                      <p className="ml-6 text-sm text-muted-foreground">
                        {a.desc}
                      </p>
                    </div>

                    <span className="text-xs text-muted-foreground">
                      {a.time}
                    </span>
                  </div>
                ))}

              </CardContent>
            </Card>

          </TabsContent>

          {/* PROJECTS */}
          <TabsContent value="projects">

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />

                  Active Projects
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">

                {projects.map((p) => (
                  <div
                    key={p.project_id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div>
                      <p className="font-medium">
                        {p.project_name}
                      </p>

                      <p className="text-sm text-muted-foreground">
                        PRJ-{p.project_id} •{" "}
                        {p.roles.map((r) => r.role_name).join(", ")} •{" "}
                        {p.status}
                      </p>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/stakeholder/projects/project-details?id=${p.project_id}`
                        )
                      }
                    >
                      Open
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

          </TabsContent>

          {/* SETTINGS */}
          <TabsContent value="settings">

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />

                  Account Settings
                </CardTitle>

                <CardDescription>
                  Update your profile information
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">

                {successMessage && (
                  <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                    {successMessage}
                  </div>
                )}

                {errorMessage && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage}
                  </div>
                )}

                {/* FIRST NAME */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    First Name
                  </label>

                  <input
                    type="text"
                    value={profile?.user.first_name || ""}
                    onChange={(e) =>
                      setProfile((prev) =>
                        prev
                          ? {
                            ...prev,
                            user: {
                              ...prev.user,
                              first_name: e.target.value,
                            },
                          }
                          : prev
                      )
                    }
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                </div>

                {/* LAST NAME */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Last Name
                  </label>

                  <input
                    type="text"
                    value={profile?.user.last_name || ""}
                    onChange={(e) =>
                      setProfile((prev) =>
                        prev
                          ? {
                            ...prev,
                            user: {
                              ...prev.user,
                              last_name: e.target.value,
                            },
                          }
                          : prev
                      )
                    }
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                </div>

                {/* EMAIL */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Email
                  </label>

                  <input
                    type="email"
                    value={profile?.user.email || ""}
                    onChange={(e) =>
                      setProfile((prev) =>
                        prev
                          ? {
                            ...prev,
                            user: {
                              ...prev.user,
                              email: e.target.value,
                            },
                          }
                          : prev
                      )
                    }
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                </div>

                {/* SAVE BUTTON */}
                <Button
                  disabled={isSaving}
                  onClick={async () => {
                    try {
                      setIsSaving(true)
                      setSuccessMessage("")
                      setErrorMessage("")

                      const token = localStorage.getItem("token")

                      const res = await fetch(`${API_BASE_URL}/me`, {
                        method: "PUT",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          first_name: profile?.user.first_name,
                          last_name: profile?.user.last_name,
                          email: profile?.user.email,
                        }),
                      })

                      const data = await res.json()

                      if (!res.ok) {
                        setErrorMessage(
                          data.message || "Failed to update profile"
                        )
                        return
                      }

                      setProfile((prev) =>
                        prev
                          ? {
                            ...prev,
                            user: data.user,
                          }
                          : prev
                      )

                      setSuccessMessage(
                        "Profile updated successfully"
                      )

                    } catch (err) {
                      console.error(err)

                      setErrorMessage(
                        "Something went wrong"
                      )
                    } finally {
                      setIsSaving(false)
                    }
                  }}
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>

              </CardContent>
            </Card>

          </TabsContent>

        </Tabs>
      </div>
    </div>
  )
}