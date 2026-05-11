"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useEffect, useState } from "react"
import {
  Shield,
  UserCheck,
  History,
  ThumbsUp,
  AlertCircle,
  FileText,
  Settings,
} from "lucide-react"

const API_BASE_URL = "http://localhost:5000/api/profile"
const ORGANIZATION_API_BASE_URL = "http://localhost:5000/api/organization"

type ProfileResponse = {
  user: {
    first_name: string
    last_name: string
    email: string
  }
  organizations: {
    id: number
    name: string
    contact_email?: string
    subscription_plan?: string
    logo?: string
  }[]
}

export default function ProfilePage() {
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

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="mx-auto max-w-6xl space-y-8 p-6 md:p-8">

        {/* HEADER */}
        <div className="rounded-2xl border bg-card p-6 md:p-8">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-2xl font-semibold">
                Organization Admin Profile
              </h1>

              <p className="mt-1 text-sm text-muted-foreground">
                Manage organization information and administrative settings
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

                    Administrator Identity
                  </CardTitle>

                  <CardDescription>
                    Organization administrator account details
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

              {/* ORGANIZATION CARD */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />

                    Organization Information
                  </CardTitle>

                  <CardDescription>
                    Current organization details and subscription
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Organization
                    </span>

                    <span className="font-medium">
                      {org?.name || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Contact Email
                    </span>

                    <span>
                      {org?.contact_email || "-"}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Subscription
                    </span>

                    <Badge variant="secondary">
                      {org?.subscription_plan || "Basic"}
                    </Badge>
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

                  Administrative Activity
                </CardTitle>

                <CardDescription>
                  Recent administrative actions and organization activities
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">

                {[
                  {
                    icon: ThumbsUp,
                    text: "Approved organization access request",
                    desc: "New member onboarding completed",
                    time: "2h ago"
                  },
                  {
                    icon: FileText,
                    text: "Updated organization settings",
                    desc: "Subscription and contact details modified",
                    time: "Yesterday"
                  },
                  {
                    icon: AlertCircle,
                    text: "Reviewed compliance logs",
                    desc: "Audit activity verification completed",
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

          {/* SETTINGS */}
          <TabsContent value="settings">

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />

                  Organization Settings
                </CardTitle>

                <CardDescription>
                  Update organization information
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

                {/* ORGANIZATION NAME */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Organization Name
                  </label>

                  <input
                    type="text"
                    value={profile?.organizations?.[0]?.name || ""}
                    onChange={(e) =>
                      setProfile((prev) =>
                        prev
                          ? {
                            ...prev,
                            organizations: [
                              {
                                ...prev.organizations[0],
                                name: e.target.value,
                              },
                            ],
                          }
                          : prev
                      )
                    }
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                </div>

                {/* CONTACT EMAIL */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Contact Email
                  </label>

                  <input
                    type="email"
                    value={profile?.organizations?.[0]?.contact_email || ""}
                    onChange={(e) =>
                      setProfile((prev) =>
                        prev
                          ? {
                            ...prev,
                            organizations: [
                              {
                                ...prev.organizations[0],
                                contact_email: e.target.value,
                              },
                            ],
                          }
                          : prev
                      )
                    }
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                </div>

                {/* SUBSCRIPTION PLAN */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Subscription Plan
                  </label>

                  <input
                    type="text"
                    value={profile?.organizations?.[0]?.subscription_plan || ""}
                    onChange={(e) =>
                      setProfile((prev) =>
                        prev
                          ? {
                            ...prev,
                            organizations: [
                              {
                                ...prev.organizations[0],
                                subscription_plan: e.target.value,
                              },
                            ],
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

                      const res = await fetch(
                        `${ORGANIZATION_API_BASE_URL}/${profile?.organizations?.[0]?.id}`,
                        {
                          method: "PUT",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                          },
                          body: JSON.stringify({
                            name: profile?.organizations?.[0]?.name,
                            contact_email:
                              profile?.organizations?.[0]?.contact_email,
                            subscription_plan:
                              profile?.organizations?.[0]?.subscription_plan,
                          }),
                        }
                      )

                      const data = await res.json()

                      if (!res.ok) {
                        setErrorMessage(
                          data.message || "Failed to update organization"
                        )
                        return
                      }

                      setProfile((prev) =>
                        prev
                          ? {
                            ...prev,
                            organizations: [data.organization],
                          }
                          : prev
                      )

                      setSuccessMessage(
                        "Organization updated successfully"
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