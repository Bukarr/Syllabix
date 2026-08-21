import { userClient } from "../clients.ts";

export interface AuthedUser {
  id: string;
  email?: string;
}

/**
 * Resolve the caller from the Authorization header.
 * Returns null when the request carries no valid session.
 */
export async function resolveUser(req: Request): Promise<AuthedUser | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  try {
    const { data, error } = await userClient(authHeader).auth.getUser();
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? undefined };
  } catch {
    return null;
  }
}