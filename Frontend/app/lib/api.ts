const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://omni-commerce-website.onrender.com/api";

export async function loginApi(payload: { email: string; password: string }) {
  const cleanBase = BASE_URL.replace(/\/api$/, "");
  const res = await fetch(`${cleanBase}/api/auth/login`, {
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