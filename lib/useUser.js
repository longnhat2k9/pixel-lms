import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export function useUser(requiredRoles) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = not logged in
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setUser(d.user))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (user === null) router.replace("/login");
    if (user && requiredRoles && !requiredRoles.includes(user.role)) {
      router.replace("/");
    }
  }, [user]);

  return user;
}

export async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Có lỗi xảy ra.");
  return data;
}

export function dashboardPath(role) {
  return role === "admin" ? "/admin" : role === "teacher" ? "/teacher" : "/student";
}
