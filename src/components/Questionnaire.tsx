import React, { useEffect, useMemo, useRef, useState } from 'react';
import {createIssue, type IssueLocalResponse, type IssueSuccessResponse} from '../services/jira';

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
        stream.getTracks().forEach(t => t.stop());
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

  const [values, setValues] = useState<Record<string, string | boolean>>(initialState);
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
        lines.push(`- ${q.name}: ${Array.isArray(val) ? val.join(', ') : String(val)}`);
      }
      const description = lines.join('\n');

      // prepare attachments: include voice recording if available
      const attachments: File[] = [];
      if (voice.audioBlob) {
        attachments.push(new File([voice.audioBlob], `recording-${Date.now()}.webm`, { type: voice.audioBlob.type || 'audio/webm' }));
      }

      const res = await createIssue({ summary, description }, attachments);
      if ((res as IssueSuccessResponse)?.id) {
          setResult(`Created JIRA issue: ${(res as IssueSuccessResponse).key} (${(res as IssueSuccessResponse).self})`);
      } else if ((res as IssueLocalResponse).storedLocally) {
          setResult('Submission stored locally (JIRA not configured).');
      } else {
          setResult('Submission sent.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="questionnaire">
      <h2>{schema.name}</h2>
      {schema.questions.map((q) => (
        <div key={q.id} className="question">
          <label className="question-label">
            <span>{q.name}</span>
            {q.description && <small className="question-desc">{q.description}</small>}
          </label>
          <div className="question-input">
            {q.type === 'text' && (
              <input
                type="text"
                value={values[q.id] as string || ''}
                onChange={(e) => onChange(q.id, e.target.value)}
              />
            )}

            {q.type === 'textarea' && (
              <div className="textarea-with-voice">
                <textarea
                  rows={4}
                  value={values[q.id] as string || ''}
                  onChange={(e) => onChange(q.id, e.target.value)}
                />
                <div className="voice-controls">
                  {!voice.recording ? (
                    <button type="button" onClick={voice.start}>🎙️ Start</button>
                  ) : (
                    <button type="button" onClick={voice.stop}>⏹️ Stop</button>
                  )}
                  {voice.error && <small className="error">{voice.error}</small>}
                  {voice.audioBlob && (
                    <audio controls src={URL.createObjectURL(voice.audioBlob)} />
                  )}
                </div>
              </div>
            )}

            {q.type === 'checkbox' && (
              <input
                type="checkbox"
                checked={!!values[q.id]}
                onChange={(e) => onChange(q.id, e.target.checked)}
              />
            )}

            {q.type === 'radio' && (
              <div className="options">
                {q.options?.map((opt) => (
                  <label key={opt} className="option">
                    <input
                      type="radio"
                      name={`radio_${q.id}`}
                      checked={values[q.id] === opt}
                      onChange={() => onChange(q.id, opt)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type === 'dropdown' && (
              <select value={values[q.id] as string || ''} onChange={(e) => onChange(q.id, e.target.value)}>
                <option value="" disabled>Select...</option>
                {q.options?.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      ))}

      <div className="actions">
        <button type="submit" disabled={submitting}>{submitting ? 'Sending...' : 'Send'}</button>
      </div>

      {error && <div className="error">{error}</div>}
      {result && <div className="success">{result}</div>}
    </form>
  );
};

export default Questionnaire;
