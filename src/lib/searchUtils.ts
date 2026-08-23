export function escapeSearchTerm(term: string): string {
  return term
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/,/g, "\\,")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

export function buildIlikeFilter(field: string, term: string): string {
  const escaped = escapeSearchTerm(term);
  return `${field}.ilike.%${escaped}%`;
}
