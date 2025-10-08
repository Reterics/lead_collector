import type { QuestionnaireStatus } from '../services/submissions/firestore.ts';

export type SubmissionEntry = {
  id: string;
  createdAt: string; // ISO
  questionnaireName: string;
  summary: string;
  description: string;
  status: QuestionnaireStatus;
  issueKey?: string;
  issueUrl?: string;
  ownerId?: string;
  ownerEmail?: string;
};

const STORAGE_KEY = 'lead_collector_submissions';

function safeParse<T>(text: string | null): T | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function loadSubmissions(): SubmissionEntry[] {
  const list =
    safeParse<SubmissionEntry[]>(localStorage.getItem(STORAGE_KEY)) || [];

  // Migrate legacy fallback records created by services/jira.ts when JIRA is not configured
  // Keys look like: questionnaire_submission_<timestamp>
  const migrated: SubmissionEntry[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (k.startsWith('questionnaire_submission_')) {
        const rec = safeParse<{
          createdAt: string;
          params?: { summary: string; description: string };
        }>(localStorage.getItem(k));
        if (rec && rec.params) {
          migrated.push({
            id: k,
            createdAt: rec.createdAt || new Date().toISOString(),
            questionnaireName: 'Unknown',
            summary: rec.params.summary,
            description: rec.params.description,
            status: 'local',
          });
        }
      }
    }
  } catch (e) {
    // ignore migration errors
    void e;
  }

  // Clear migrated keys and merge into list (avoid duplicates by id)
  if (migrated.length) {
    for (const m of migrated) {
      localStorage.removeItem(m.id);
    }
    const map = new Map<string, SubmissionEntry>();
    for (const s of list) map.set(s.id, s);
    for (const m of migrated) if (!map.has(m.id)) map.set(m.id, m);
    const merged = Array.from(map.values());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return merged;
  }

  return list;
}

export function saveSubmission(entry: SubmissionEntry) {
  const list = loadSubmissions();
  // Replace by id if exists
  const idx = list.findIndex((x) => x.id === entry.id);
  if (idx >= 0) list[idx] = entry;
  else list.unshift(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function removeSubmission(id: string) {
  const list = loadSubmissions();
  const filtered = list.filter((x) => x.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
