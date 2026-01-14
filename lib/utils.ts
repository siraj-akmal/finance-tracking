import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Remove all numbers from a string
 */
export function removeNumbers(text: string | null | undefined): string {
  if (!text) return text || ""
  return text.replace(/\d/g, "").trim()
}
