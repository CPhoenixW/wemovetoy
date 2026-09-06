export function formatPrice(
  value: number | string | null | undefined,
): string {
  const amount = typeof value === "string" ? Number(value) : value;
  if (amount == null || !Number.isFinite(amount)) return "—";
  return `¥${amount.toFixed(2)}`;
}

export function formatAgeRange(
  ageMin: number | null | undefined,
  ageMax: number | null | undefined,
): string | null {
  if (ageMin == null && ageMax == null) return null;
  if (ageMax == null) return `${ageMin}岁+`;
  if (ageMin == null) return `≤${ageMax}岁`;
  return `${ageMin}–${ageMax}岁`;
}
