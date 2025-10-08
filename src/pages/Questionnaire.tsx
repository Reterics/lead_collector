import React, {useContext, useEffect, useMemo, useRef, useState} from 'react';
import {
  createAttachments,
  createIssue, getJiraConfig,
  type JiraConfig,
} from '../services/jira.ts';
import {saveSubmission} from '../utils/submissions.ts';
import {useTranslation} from 'react-i18next';
import {useNavigate, useParams, Link} from 'react-router-dom';
import {
  createBaseItem,
  saveToFirebaseStorage,
  saveToFirestore,
} from '../services/submissions/firestore.ts';
import { useJiraAuth } from '../context/JiraAuthContext.tsx';
import { transcribeViaFunction } from '../utils/transcribeClient.ts';
import { DBContext } from '../context/DBContext.ts';

// Types matching the provided JSON format
export type Question = {
  id: string;
  name: string;
  type: 'text' | 'textarea' | 'checkbox' | 'radio' | 'dropdown' | 'image';
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

// MediaRecorder hook for voice recording with selectable audio input device
function useVoiceRecorder() {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [initialised, setInitialised] = useState(false);

  const refreshDevices = async () => {
    try {
      // Attempt to get permission so device labels are populated
      if (!initialised) {
        try {
          const tmpStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          tmpStream.getTracks().forEach((t) => t.stop());
        } catch {
          // ignore, enumerateDevices may still work, but labels could be empty
        }
        setInitialised(true);
      }
      const all = await navigator.mediaDevices.enumerateDevices();
      const mics = all.filter((d) => d.kind === 'audioinput');
      setDevices(mics);
      // Keep selection if still available; otherwise choose first
      setSelectedDeviceId((prev) => {
        if (prev && mics.some((d) => d.deviceId === prev)) return prev;
        return mics[0]?.deviceId || '';
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Unable to list audio devices.';
      setError(msg);
    }
  };

  useEffect(() => {
    void refreshDevices();
    const handler = () => refreshDevices();
    navigator.mediaDevices?.addEventListener?.('devicechange', handler);
    return () => {
      navigator.mediaDevices?.removeEventListener?.('devicechange', handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    try {
      setError(null);
      setAudioBlob(null);
      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      const chunks: BlobPart[] = [];
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        console.error(blob)
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.onerror = (e) => {
        console.error(e);
      }
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

  return { recording, audioBlob, start, stop, error, devices, selectedDeviceId, setSelectedDeviceId, refreshDevices };
}

// Textarea field with its own voice recorder instance
const TextareaWithRecorder: React.FC<{
  value: string;
  onChange: (v: string) => void;
  onRecordingChange: (blob: Blob | null) => void;
}> = ({ value, onChange, onRecordingChange }) => {
  const { t } = useTranslation();
  const voice = useVoiceRecorder();
  const [transcribing, setTranscribing] = useState(false);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  useEffect(() => {
    onRecordingChange(voice.audioBlob);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice.audioBlob]);

  const doTranscribeGcs = async () => {
    if (!voice.audioBlob) return;
    try {
      setTranscribeError(null);
      setTranscribing(true);
      const file = new File([voice.audioBlob], "audio.webm", { type: voice.audioBlob.type || 'audio/webm' });
      const { transcript } = await transcribeViaFunction(file, 'en-US');
      const newValue = value ? (value.trim() ? value + "\n" + transcript : transcript) : transcript;
      onChange(newValue);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Transcription failed';
      setTranscribeError(msg);
    } finally {
      setTranscribing(false);
    }
  };

  return (
    <div className="mt-1">
      <textarea
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="flex items-center sm:flex-row sm:items-center gap-2 mt-2">
        <select
          value={voice.selectedDeviceId}
          onChange={(e) => voice.setSelectedDeviceId(e.target.value)}
          className="block rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {voice.devices.length === 0 && (
            <option value="">
              {t('questionnaire.no_mics') || 'No microphones found'}
            </option>
          )}
          {voice.devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || t('questionnaire.unknown_mic') || 'Microphone'}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={voice.refreshDevices}
          title={t('questionnaire.refresh_mics') || 'Refresh microphones'}
          className="px-2 py-1 text-xs rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
        >
          ⟳
        </button>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
        {!voice.recording ? (
          <button
            type="button"
            onClick={voice.start}
            disabled={!voice.selectedDeviceId}
            className={`px-3 py-1.5 text-sm rounded-md text-white focus:outline-none focus:ring-2 ${!voice.selectedDeviceId ? 'bg-emerald-400/50 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'}`}
          >
            🎙️ {t('questionnaire.start')}
          </button>
        ) : (
          <button
            type="button"
            onClick={voice.stop}
            className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            ⏹️ {t('questionnaire.stop')}
          </button>
        )}
        <button
          type="button"
          onClick={doTranscribeGcs}
          disabled={!voice.audioBlob || transcribing}
          className={`px-3 py-1.5 text-sm rounded-md text-white focus:outline-none focus:ring-2 ${!voice.audioBlob || transcribing ? 'bg-blue-400/50 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}`}
        >
          {transcribing ? (t('questionnaire.transcribing') || 'Transcribing...') : (t('questionnaire.transcribe_gcs') || 'Transcribe (GCS)')}
        </button>

        {voice.error && (
          <span className="text-xs text-red-600 dark:text-red-400">
            {voice.error}
          </span>
        )}
        {transcribeError && (
          <span className="text-xs text-red-600 dark:text-red-400">
            {transcribeError}
          </span>
        )}

        {voice.audioBlob && (
          <audio
            controls
            src={URL.createObjectURL(voice.audioBlob)}
            className="w-full"
          />
        )}
      </div>
    </div>
  );
};

// Simple in-app camera capture to avoid native camera autofocus-loop
const CameraCapture: React.FC<{
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}> = ({ open, onClose, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [initialised, setInitialised] = useState(false);
  const { t } = useTranslation();

  const stopStream = () => {
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const startStream = async (mode: 'user' | 'environment') => {
    try {
      setError(null);
      stopStream();
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      // Try to apply focus-related constraints if supported to reduce hunting
      const track = s.getVideoTracks()[0];
      try {
        // @ts-expect-error - focusMode is not in standard typings
        await track.applyConstraints?.({ advanced: [{ focusMode: 'continuous' }] });
      } catch { /* ignore */ }
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play().catch(() => {/* ignore */});
      }
      setInitialised(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t('camera.error_unable_access');
      setError(msg);
    }
  };

  useEffect(() => {
    if (open) {
      void startStream(facingMode);
    }
    return () => { stopStream(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const flip = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    void startStream(next);
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    const blob: Blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b as Blob), 'image/jpeg', 0.92));
    const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
    onCapture(file);
    onClose();
    stopStream();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />

      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-end">
        <button
          onClick={() => { onClose(); stopStream(); }}
          className="px-3 py-1.5 rounded-md bg-black/60 text-white text-sm hover:bg-black/80"
>
          {t('camera.close')}
        </button>
      </div>

      {error && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded bg-red-600 text-white text-xs">
          {error}
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={flip}
          className="px-3 py-2 text-sm rounded-md bg-white/80 text-gray-900 hover:bg-white"
>
          {facingMode === 'environment' ? `↺ ${t('camera.front')}` : `↻ ${t('camera.rear')}`}
        </button>
        <button
          type="button"
          disabled={!initialised}
          onClick={capture}
          className={`px-4 py-2 text-sm rounded-full text-white shadow ${initialised ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-400/50 cursor-not-allowed'}`}
>
          {t('camera.capture')}
        </button>
      </div>
    </div>
  );
};

export const Questionnaire: React.FC<QuestionnaireProps> = ({ schema }) => {
  const { t } = useTranslation();
  const { status } = useJiraAuth();
  const db = useContext(DBContext);
  const jiraCfg: JiraConfig = getJiraConfig(db?.data?.currentUser);
  const initialState = useMemo(() => {
    const s: Record<string, string | boolean> = {};
    for (const q of schema.questions) {
      if (q.type === 'checkbox') s[q.id] = false;
      else s[q.id] = '';
    }
    // Terms acceptance checkbox default
    s['accept_terms'] = false;
    return s;
  }, [schema]);

  const [values, setValues] =
    useState<Record<string, string | boolean>>(initialState);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordings, setRecordings] = useState<Record<string, Blob | null>>({});
  const [images, setImages] = useState<Record<string, File | null>>({});
  const [cameraFor, setCameraFor] = useState<string | null>(null);

  // Split-button dropdown state
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuOpenUp, setMenuOpenUp] = useState(false);
  const splitRef = useRef<HTMLDivElement | null>(null);

  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id: string }>();

  useEffect(() => {
    // reset when schema changes
    setValues(initialState);
  }, [initialState]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (splitRef.current && !splitRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const toggleMenu = () => {
    setMenuOpen((prev) => {
      const next = !prev;
      if (!prev) {
        const rect = splitRef.current?.getBoundingClientRect();
        if (rect) {
          const spaceBelow = window.innerHeight - rect.bottom;
          setMenuOpenUp(spaceBelow < 180);
        }
      }
      return next;
    });
  };

  const onChange = (id: string, value: string | boolean) => {
    setValues((v) => ({ ...v, [id]: value }));
  };

  const submit = async (opts?: { skipJira?: boolean }) => {
    setSubmitting(true);
    setError(null);
    setResult(null);

    // Enforce Terms and Conditions acceptance
    if (!values['accept_terms']) {
      setError(t('questionnaire.accept_terms_error') || 'You must accept the Terms and Conditions to proceed.');
      setSubmitting(false);
      return;
    }

    const baseItem = createBaseItem(schema, values);
    // Attach ownership for role-based access control
    if (db?.data?.currentUser) {
      baseItem.ownerId = db.data.currentUser.id;
      baseItem.ownerEmail = db.data.currentUser.email;
    }
    const attachments: File[] = createAttachments(schema, recordings, images);


    // Step 1: Save to Firestore DB for persistence
    try {
      baseItem.status = 'firestore';
      await saveToFirestore(baseItem)
      await saveToFirebaseStorage(baseItem, recordings, schema, images)
    } catch (e) {
      console.error('Failed to save to Firestore', e);
      baseItem.status = 'created';
    }

    // Step 2: Create issue in JIRA if configured and not skipped
    if (!opts?.skipJira && status === 202) {
      try {
        const res = await createIssue(baseItem, attachments, jiraCfg);
        const firestoreSaved = baseItem.status === 'firestore';
        if (res?.id) {
          baseItem.status = 'jira';
          baseItem.issueKey = res.key;
          baseItem.issueUrl = res.self;
          if (firestoreSaved) {
            await saveToFirestore(baseItem);
          }
        }
      } catch (e) {
        console.error('Failed to create issue', e);
      }
    }

    // Step 3: Save results to LocalStorage as local backup
    if (baseItem.status === 'created') {
      baseItem.status = 'local';
    }
    saveSubmission(baseItem)

    // Navigate to success page if JIRA issue was created
    if (baseItem.status === 'jira') {
      const successPath = routeId
        ? `/questionnaires/${routeId}/success`
        : '/';
      navigate(successPath, {
        state: baseItem,
        replace: false,
      });
    } else if (baseItem.status === 'local' || baseItem.status === 'firestore') {
      setTimeout(() => {
        navigate('/submissions');
      }, 2000);
    }

    setSubmitting(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submit({ skipJira: false });
  };

  return (
    <>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          {schema.name}
        </h2>
      </div>
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="group relative overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <label className="inline-flex items-start gap-3">
            <input
              type="checkbox"
              checked={!!values['accept_terms']}
              onChange={(e) => onChange('accept_terms', e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-800 dark:text-gray-100">
              {t('questionnaire.accept_terms_text') || 'I accept the'}{' '}
              <Link to="/terms" className="text-blue-600 underline">
                {t('questionnaire.terms_link') || 'Terms and Conditions'}
              </Link>
            </span>
          </label>
        </div>
        {schema.questions.map((q) => (
          <div
            key={q.id}
            className="group relative overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-gray-800 dark:to-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm"
          >
            <label className="block mb-2">
              <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                {q.name}
              </span>
              {q.description && (
                <span className="block text-xs text-gray-600 dark:text-gray-300">
                  {q.description}
                </span>
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
                <TextareaWithRecorder
                  value={(values[q.id] as string) || ''}
                  onChange={(v) => onChange(q.id, v)}
                  onRecordingChange={(blob) =>
                    setRecordings((prev) => ({ ...prev, [q.id]: blob }))
                  }
                />
              )}

              {q.type === 'checkbox' && (
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!values[q.id]}
                    onChange={(e) => onChange(q.id, e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-200">
                    {t('questionnaire.yes')}
                  </span>
                </label>
              )}

              {q.type === 'radio' && (
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 mt-1">
                  {q.options?.map((opt) => (
                    <label
                      key={opt}
                      className="inline-flex items-center gap-2 rounded-md border border-gray-200 dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-700"
                    >
                      <input
                        type="radio"
                        name={`radio_${q.id}`}
                        checked={values[q.id] === opt}
                        onChange={() => onChange(q.id, opt)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-800 dark:text-gray-100">
                        {opt}
                      </span>
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
                    {t('questionnaire.select')}
                  </option>
                  {q.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}

              {q.type === 'image' && (
                <div className="mt-1">
                  {!images[q.id] && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCameraFor(q.id)}
                        className="px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700"
                      >
                        {t('questionnaire.use_camera') || 'Use camera'}
                      </button>
                      <label className="inline-block">
                        <span className="sr-only">{t('questionnaire.upload_image') || 'Upload image'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                            setImages((prev) => ({ ...prev, [q.id]: file }));
                          }}
                          className="hidden"
                        />
                        <span className="px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">
                          {t('questionnaire.upload_from_device') || 'Upload from device'}
                        </span>
                      </label>
                    </div>
                  )}
                  {images[q.id] && (
                    <div className="flex items-start gap-3">
                      <img
                        src={URL.createObjectURL(images[q.id] as File)}
                        alt={q.name}
                        className="h-24 w-24 object-cover rounded border border-gray-200 dark:border-gray-700"
                      />
                      <div className="flex flex-col gap-2">
                        <div className="text-xs text-gray-600 dark:text-gray-300">
                          {(images[q.id] as File)?.name}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setCameraFor(q.id)}
                            className="px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-700"
                          >
                            {t('questionnaire.retake_camera') || 'Retake (camera)'}
                          </button>
                          <label className="inline-block">
                            <span className="sr-only">{t('questionnaire.change_image') || 'Change image'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                                setImages((prev) => ({ ...prev, [q.id]: file }));
                              }}
                              className="hidden"
                            />
                            <span className="px-3 py-1.5 text-xs rounded-md border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer">
                              {t('questionnaire.change') || 'Change'}
                            </span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setImages((prev) => ({ ...prev, [q.id]: null }))}
                            className="px-3 py-1.5 text-xs rounded-md border border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30"
                          >
                            {t('questionnaire.remove') || 'Remove'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="pt-2 justify-self-end mb-2">
          <div ref={splitRef} className="relative inline-flex items-stretch w-full sm:w-auto">
            <button
              type="button"
              disabled={submitting}
              onClick={() => submit({ skipJira: false })}
              className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 rounded-l-md rounded-r-none bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {submitting ? (t('questionnaire.sending') || 'Sending...') : (t('questionnaire.send') || 'Send')}
            </button>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              disabled={submitting}
              onClick={toggleMenu}
              className="px-3 py-2.5 rounded-r-md rounded-l-none border-l border-blue-500 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              title={t('questionnaire.more_options') || 'More options'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.108l3.71-3.878a.75.75 0 111.08 1.04l-4.24 4.432a.75.75 0 01-1.08 0L5.25 8.27a.75.75 0 01-.02-1.06z" clipRule="evenodd" />
              </svg>
            </button>

            {menuOpen && (
              <div
                role="menu"
                aria-label={t('questionnaire.send_options') || 'Send options'}
                className={`absolute z-20 right-0 ${menuOpenUp ? 'bottom-full mb-2' : 'top-full mt-2'} w-56 overflow-hidden rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg`}
              >
                <div className="py-1">
                  <button
                    role="menuitem"
                    type="button"
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => { setMenuOpen(false); submit({ skipJira: true }); }}
                  >
                    {t('questionnaire.send_without_jira') || 'Send without JIRA'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
        )}
        {result && (
          <div className="text-sm text-emerald-700 dark:text-emerald-400">
            {result}
          </div>
        )}
      </form>
      <CameraCapture
        open={!!cameraFor}
        onClose={() => setCameraFor(null)}
        onCapture={(file) => {
          if (cameraFor) {
            setImages((prev) => ({ ...prev, [cameraFor]: file }));
          }
        }}
      />
    </>
  );
};

export default Questionnaire;
