"use client";

export async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  return handleResponse<T>(response);
}

export async function apiPostJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return handleResponse<T>(response);
}

export async function apiPostForm<T>(url: string, values: Record<string, string>): Promise<T> {
  const form = new FormData();
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  const response = await fetch(url, { method: "POST", body: form });
  return handleResponse<T>(response);
}

async function handleResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as T & { error?: string; message?: string };
  if (!response.ok) {
    const message = typeof payload.error === "string" ? payload.error : typeof payload.message === "string" ? payload.message : "Request failed";
    throw new Error(message);
  }
  return payload;
}
