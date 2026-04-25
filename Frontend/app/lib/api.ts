const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

export async function loginApi(payload: { email: string; password: string }) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data?.message || `Login failed (${res.status})`);
  }

  return data;
}