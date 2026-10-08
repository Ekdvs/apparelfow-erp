export const validateWholeNumber = (v: string, min = 0, max = 1_000_000): string | null => {
  const t = v.trim();
  if (t === "") return "This field is required";
  if (!/^\d+$/.test(t)) return "Whole numbers only (no negatives, decimals or letters)";
  const n = Number(t);
  if (n < min) return `Must be at least ${min}`;
  if (n > max) return `Must be at most ${max.toLocaleString()}`;
  return null;
};

// Fabric yards can legitimately have decimals
export const validatePositiveDecimal = (v: string, max = 1_000_000): string | null => {
  const t = v.trim();
  if (t === "") return "This field is required";
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return "Enter a positive number (up to 2 decimals)";
  const n = Number(t);
  if (n <= 0) return "Must be greater than 0";
  if (n > max) return `Must be at most ${max.toLocaleString()}`;
  return null;
};