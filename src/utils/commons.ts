export const formatDateTimeLocal = (input: Date | number) => {
  if (typeof input === 'number' && Number.isNaN(input)) {
    return '?';
  }
  const date = input instanceof Date ? input : new Date(input);

  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
};

/**
 * Generates a unique ID for Firebase documents
 * Uses timestamp + random string for uniqueness
 */
export const generateFirebaseDocId = (): string => {
  const timestamp = Date.now().toString(36); // Base36 timestamp
  const randomPart = Math.random().toString(36).substring(2, 8); // 6 random chars
  return `${timestamp}_${randomPart}`;
};

/**
 * Alternative method using crypto.randomUUID if available (modern browsers)
 * Falls back to timestamp-based generation
 */
export const generateSecureFirebaseDocId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return generateFirebaseDocId();
};

/**
 * Generates a Firebase-compatible ID with custom prefix
 * Useful for categorizing documents by type
 */
export const generatePrefixedFirebaseDocId = (prefix: string): string => {
  const id = generateFirebaseDocId();
  return `${prefix}_${id}`;
};
