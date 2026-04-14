const API_BASE_URL = "http://localhost:5000/api/business-analyst"

async function parseJsonResponse(response: Response) {
  const contentType = response.headers.get("content-type") || ""
  const text = await response.text()

  if (!contentType.includes("application/json")) {
    console.error("Non-JSON response:", text)
    throw new Error("Failed to fetch requirements. Server returned non-JSON response.")
  }

  try {
    return JSON.parse(text)
  } catch (error) {
    console.error("Invalid JSON response:", text)
    throw new Error("Failed to parse server response.")
  }
}

export async function getProjectRequirements(projectId: number) {
  const response = await fetch(`${API_BASE_URL}/project/${projectId}/requirements`, {
    method: "GET",
    credentials: "include",
  })

  const data = await parseJsonResponse(response)

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch requirements")
  }

  return data.documents || []
}

export async function getRequirementDocument(projectId: number, documentId: number) {
  const response = await fetch(
    `${API_BASE_URL}/project/${projectId}/requirements/${documentId}`,
    {
      method: "GET",
      credentials: "include",
    }
  )

  const data = await parseJsonResponse(response)

  if (!response.ok) {
    throw new Error(data.message || "Failed to fetch requirement document")
  }

  return data.document
}

export async function createRequirement(
  projectId: number,
  payload: {
    values: Record<string, string>
    status?: string
    change_type?: "minor" | "major"
  }
) {
  const response = await fetch(`${API_BASE_URL}/project/${projectId}/requirements`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  })

  const data = await parseJsonResponse(response)

  if (!response.ok) {
    throw new Error(data.message || "Failed to create requirement")
  }

  return data.document
}

export async function updateRequirement(
  projectId: number,
  documentId: number,
  payload: {
    values: Record<string, string>
    status?: string
  }
) {
  const response = await fetch(
    `${API_BASE_URL}/project/${projectId}/requirements/${documentId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    }
  )

  const data = await parseJsonResponse(response)

  if (!response.ok) {
    throw new Error(data.message || "Failed to update requirement")
  }

  return data.document
}

export async function deleteRequirement(projectId: number, documentId: number) {
  const response = await fetch(
    `${API_BASE_URL}/project/${projectId}/requirements/${documentId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  )

  const data = await parseJsonResponse(response)

  if (!response.ok) {
    throw new Error(data.message || "Failed to delete requirement")
  }

  return data
}