import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  createIssue,
  type IssueLocalResponse,
  type IssueSuccessResponse,
  type IssueRedirectResponse,
} from '../services/jira.ts';
import { saveSubmission } from '../utils/submissions.ts';
import { firebaseModel } from '../config.ts';

// Types matching the provided JSON format
export type Question = {
  id: string;
  name: string;
  type: 'text' | 'textarea' | 'checkbox' | 'radio' | 'dropdown';
  description?: string;
  options?: string[];
};

export type QuestionnaireSchema = {
  name: string;
  questions: Question[];
};

export type QuestionnaireProps = {
  schema: QuestionnaireSchema;
};

// MediaRecorder hook for simple voice recording
function useVoiceRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    try {
      setError(null);
      setAudioBlob(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      const chunks: BlobPart[] = [];
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setRecording(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Microphone access denied.';
      setError(msg);
    }
  };

  const stop = () => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      mr.stop();
      setRecording(false);
    }
  };

  return { recording, audioBlob, start, stop, error };
}

export const Questionnaire: React.FC<QuestionnaireProps> = ({ schema }) => {
  const initialState = useMemo(() => {
    const s: Record<string, string | boolean> = {};
    for (const q of schema.questions) {
      if (q.type === 'checkbox') s[q.id] = false;
      else s[q.id] = '';
    }
    return s;
  }, [schema]);

  const [values, setValues] =
    useState<Record<string, string | boolean>>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const voice = useVoiceRecorder();

  useEffect(() => {
    // reset when schema changes
    setValues(initialState);
  }, [initialState]);

  const onChange = (id: string, value: string | boolean) => {
    setValues((v) => ({ ...v, [id]: value }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      // build summary and description for JIRA
      const summary = `${schema.name} response - ${new Date().toLocaleString()}`;
      const lines: string[] = [];
      for (const q of schema.questions) {
        const val = values[q.id];
        lines.push(
          `- ${q.name}: ${Array.isArray(val) ? val.join(', ') : String(val)}`,
        );
      }
      const description = lines.join('\n');

      // prepare attachments: include voice recording if available
      const attachments: File[] = [];
      if (voice.audioBlob) {
        attachments.push(
          new File([voice.audioBlob], `recording-${Date.now()}.webm`, {
            type: voice.audioBlob.type || 'audio/webm',
          }),
        );
      }

      const res = await createIssue({ summary, description }, attachments);
      // Determine status for submissions list
      let status: 'jira' | 'local' | 'auth' | 'unknown' = 'unknown';
      let issueKey: string | undefined;
      let issueUrl: string | undefined;
      if ((res as IssueSuccessResponse)?.id) {
        status = 'jira';
        issueKey = (res as IssueSuccessResponse).key;
        issueUrl = (res as IssueSuccessResponse).self;
        setResult(
          `Created JIRA issue: ${(res as IssueSuccessResponse).key} (${(res as IssueSuccessResponse).self})`,
        );
      } else if ((res as IssueLocalResponse).storedLocally) {
        status = 'local';
        setResult('Submission stored locally (JIRA not configured).');
      } else if ((res as IssueRedirectResponse)?.redirectingToAuth) {
        status = 'auth';
        setResult('Redirecting to JIRA authentication...');
      } else {
        setResult('Submission sent.');
      }
      const id = (typeof window !== 'undefined' && typeof window.crypto?.randomUUID === 'function')
        ? window.crypto.randomUUID()
        : `sub_${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

      // Persist to Firestore regardless of JIRA outcome
      try {
        await firebaseModel.add(
          {
            createdAt: new Date().toISOString(),
            questionnaireName: schema.name,
            summary,
            description,
            status,
            issueKey,
            issueUrl,
            values,
            questions: schema.questions.map((q) => ({ id: q.id, name: q.name, type: q.type })),
          },
          'submissions',
        );
      } catch (e) {
        console.error('Failed to write submission to Firestore', e);
      }

      // Keep local submissions list behavior
      if (status !== 'local') {
        saveSubmission({
          id,
          createdAt: new Date().toISOString(),
          questionnaireName: schema.name,
          summary,
          description,
          status,
          issueKey,
          issueUrl,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit';
      setError(msg);
      // Persist error submission to Firestore
      try {
        await firebaseModel.add(
          {
            createdAt: new Date().toISOString(),
            questionnaireName: schema.name,
            summary: `${schema.name} response - ${new Date().toLocaleString()}`,
            description: Object.entries(values).map(([k,v]) => `${k}: ${String(v)}`).join('\n'),
            status: 'error',
            error: msg,
            values,
            questions: schema.questions.map((q) => ({ id: q.id, name: q.name, type: q.type })),
          },
          'submissions',
        );
      } catch (e) {
        console.error('Failed to write error submission to Firestore', e);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{schema.name}</h2>
        </div>
        <form onSubmit={onSubmit} className="space-y-5">
          {schema.questions.map((q) => (
            <div key={q.id} className="group relative overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
              <label className="block mb-2">
                <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{q.name}</span>
                {q.description && (
                  <span className="block text-xs text-gray-600 dark:text-gray-300">{q.description}</span>
                )}
              </label>
              <div>
                {q.type === 'text' && (
                  <input
                    type="text"
                    value={(values[q.id] as string) || ''}
                    onChange={(e) => onChange(q.id, e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}

                {q.type === 'textarea' && (
                  <div className="mt-1">
                    <textarea
                      rows={4}
                      value={(values[q.id] as string) || ''}
                      onChange={(e) => onChange(q.id, e.target.value)}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2 mt-2">
                      {!voice.recording ? (
                        <button type="button" onClick={voice.start} className="px-3 py-1.5 text-sm rounded-md bg-emerald-600 text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                          🎙️ Start
                        </button>
                      ) : (
                        <button type="button" onClick={voice.stop} className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500">
                          ⏹️ Stop
                        </button>
                      )}
                      {voice.error && (
                        <span className="text-xs text-red-600 dark:text-red-400">{voice.error}</span>
                      )}
                      {voice.audioBlob && (
                        <audio controls src={URL.createObjectURL(voice.audioBlob)} className="w-full" />
                      )}
                    </div>
                  </div>
                )}

                {q.type === 'checkbox' && (
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!values[q.id]}
                      onChange={(e) => onChange(q.id, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-200">Yes</span>
                  </label>
                )}

                {q.type === 'radio' && (
                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 mt-1">
                    {q.options?.map((opt) => (
                      <label key={opt} className="inline-flex items-center gap-2 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-700">
                        <input
                          type="radio"
                          name={`radio_${q.id}`}
                          checked={values[q.id] === opt}
                          onChange={() => onChange(q.id, opt)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-800 dark:text-gray-100">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {q.type === 'dropdown' && (
                  <select
                    value={(values[q.id] as string) || ''}
                    onChange={(e) => onChange(q.id, e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="" disabled>
                      Select...
                    </option>
                    {q.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          ))}

          <div className="pt-2">
            <button type="submit" disabled={submitting} className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              {submitting ? 'Sending...' : 'Send'}
            </button>
          </div>

          {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
          {result && <div className="text-sm text-emerald-700 dark:text-emerald-400">{result}</div>}
        </form>
      </div>
    </section>
  );
};

export default Questionnaire;
