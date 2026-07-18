/**
 * Small class-name helper (lightweight alternative to clsx/tailwind-merge).
 * Filters out falsy values and joins with a space.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
