// Simple in-memory auth state — no localStorage (blocked in sandbox)
// The App component holds the user in React state and passes it down via context

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  jobTitle?: string;
}

export function authHeaders(user: AuthUser | null) {
  if (!user) return {};
  return { "x-user-id": String(user.id) };
}
