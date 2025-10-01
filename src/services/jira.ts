import type { VoiceRecordings } from './submissions/firestore.ts';
import type { QuestionnaireSchema } from '../pages/Questionnaire.tsx';
import { convertStringToADF } from '../utils/jira.ts';
import {baseUrl} from "../utils/commons.ts";

export type JiraConfig = {
  projectKey?: string;
  issueType?: string;
};

export const getJiraConfig = (): JiraConfig => ({
  projectKey: import.meta.env.VITE_JIRA_PROJECT_KEY,
  issueType: import.meta.env.VITE_JIRA_ISSUE_TYPE || 'Task',
});

const isConfigured = (cfg: JiraConfig) => !!cfg.projectKey;

export type CreateIssueParams = {
  summary: string;
  description: string;
};

function currentUrlForRedirect() {
  // Preserve full URL so we land back on the same page/state
  return encodeURIComponent(window.location.href);
}

async function callApi(action: string, init: RequestInit): Promise<Response> {
  const url = baseUrl(`api.php?action=${action}`);
  const resp = await fetch(url, {
    credentials: 'include', // send PHP session cookie
    ...init,
  });

  // If not authenticated, kick off OAuth 3LO
  if (resp.status === 401) {
    window.location.href = baseUrl(`auth.php?action=start&redirect=${currentUrlForRedirect()}`);
    // Return a Response-like object to keep types happy if caller awaits
    // but effectively the navigation above takes over.
  }
  return resp;
}

export type IssueSuccessResponse = {
  id: string;
  key: string;
  self: string;
};


export type CheckConnectionResponse = {
  error: string | null;
  message?: string;
  status?: number;
};

export const createAttachments = (schema: QuestionnaireSchema, recordings: VoiceRecordings):File[] => {
  const attachments: File[] = [];
  for (const [qid, blob] of Object.entries(recordings)) {
    if (blob) {
      const questionNumber = schema.questions.findIndex(question => question.id === qid);
      const questionId = questionNumber !== -1 ? (questionNumber + 1) : qid;
      attachments.push(
        new File([blob], `question-${questionId}-${Date.now()}.webm`, {
          type: blob.type || 'audio/webm',
        }),
      );
    }
  }
  return attachments;
}

export async function checkJiraConnection(): Promise<{ status: number; json: CheckConnectionResponse | null }> {
  try {
    const resp = await fetch(baseUrl(`api.php?action=check-connection`), {
      method: 'GET',
      credentials: 'include',
    });
    let json: CheckConnectionResponse | null = null;
    if (resp.status === 200) {
      return {
        status: 404,
        json: {error: 'network_error', message: 'API Unreachable'}
      }
    }
    try {
      json = (await resp.json()) as CheckConnectionResponse;
    } catch {
      json = null;
    }
    return { status: resp.status, json };
  } catch (e) {
    return { status: 0, json: { error: 'network_error', message: (e as Error)?.message || 'Network error' } };
  }
}

export const createIssue = async (
  params: CreateIssueParams,
  _attachments?: File[],
): Promise<
  IssueSuccessResponse
> => {
  const cfg = getJiraConfig();
  if (!isConfigured(cfg)) {
    throw new Error('Jira not configured');
  }

  // 1) Create the issue via backend (server handles Bearer + cloudId)
  const createResp = await callApi('create-issue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectKey: cfg.projectKey,
      issueType: cfg.issueType,
      summary: params.summary,
      description: convertStringToADF(params.description),
    }),
  });

  if (createResp.status === 401) {
    throw new Error('Jira not authenticated');
  }
  if (!createResp.ok) {
    const text = await createResp.text();
    throw new Error(`Jira createIssue failed: ${createResp.status} ${text}`);
  }

  const issue = (await createResp.json()) as IssueSuccessResponse;

  // 2) Upload attachments (best-effort)
  if (_attachments && _attachments.length && issue?.key) {
    // Upload sequentially to surface first error sooner; switch to Promise.all if you prefer
    for (const file of _attachments) {
      const form = new FormData();
      form.append('file', file);

      const upResp = await callApi(
        `upload-attachment&issueKey=${encodeURIComponent(issue.key)}`,
        { method: 'POST', body: form },
      );

      if (upResp.status === 401) {
        throw new Error('Jira not authenticated');
      }
      if (!upResp.ok) {
        // Don’t fail the entire flow — log only
        console.error('Attachment upload failed', await upResp.text());
      }
    }
  }

  return issue;
};
