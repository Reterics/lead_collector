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

export const normalizeJiraUrl = (selfUrl?: string, key?: string): string | undefined => {
  if (!selfUrl) return undefined;
  try {
    const u = new URL(selfUrl);
    // If this looks like an Atlassian API URL, try to transform to the browse link
    // Example: https://api.atlassian.com/ex/jira/{cloudId}/rest/api/3/issue/{key}
    if (u.hostname === 'api.atlassian.com' && key) {
      const cloudId = import.meta.env.VITE_JIRA_COULD_ID || '';
      if (cloudId) {
        return `https://${cloudId}.atlassian.net/browse/${encodeURIComponent(
          key,
        )}`;
      }
    }
    return selfUrl;
  } catch {
    return selfUrl;
  }
};

export const baseUrl = (path: string): string => {
  const base = import.meta.env.DEV ? '/' : (import.meta.env.VITE_BASENAME || '/');
  const trimmedBase = base.endsWith('/') ? base : base + '/';
  const trimmedPath = path.startsWith('/') ? path.slice(1) : path;
  return trimmedBase + trimmedPath;
};
