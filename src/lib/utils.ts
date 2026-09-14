import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Narrow an unknown thrown value to a displayable message.
 * Keeps catch blocks type-safe (no `any`) without losing provider messages.
 */
export function errorMessage(e: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === 'string' && e) return e;
  return fallback;
}
