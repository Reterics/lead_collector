import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQuestionnaireContext } from '../context/QuestionnaireContext.tsx';
import { useNavigate } from 'react-router-dom';
import {
  FiDownload,
  FiTrash2,
  FiEdit,
  FiPlay,
  FiShare2,
} from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import { DBContext } from '../context/DBContext.ts';
import { firebaseModel } from '../config.ts';

const Home: React.FC = () => {
  const { questionnaires, remove, getById, upsert } = useQuestionnaireContext();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { t } = useTranslation();

  // Share modal state for questionnaires
  const db = useContext(DBContext);
  const currentUser = db?.data?.currentUser;
  const userTeamId = useMemo(() => currentUser?.teamId || currentUser?.id, [currentUser?.teamId, currentUser?.id]);
  const [shareForId, setShareForId] = useState<string | null>(null);
  const [teamEmails, setTeamEmails] = useState<string[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<Record<string, boolean>>({});
  const [loadingTeam, setLoadingTeam] = useState<boolean>(false);

  const openShare = async (qId: string) => {
    const q = getById(qId);
    if (!q) return;
    const isAdmin = currentUser?.role === 'admin';
    const isOwner = (currentUser?.id && q.ownerId === currentUser.id) || (currentUser?.email && q.ownerEmail === currentUser.email);
    if (!isAdmin && !isOwner) {
      alert('You do not have permission to share this questionnaire.');
      return;
    }
    setLoadingTeam(true);
    try {
      let users = Array.isArray(db?.data?.users) ? db!.data!.users : [];
      if (!users || users.length <= 1) {
        users = (await firebaseModel.getAll('users', true)) as unknown as Array<{ id: string; email?: string; teamId?: string }>; 
      }
      const ownerEmail = q.ownerEmail?.toLowerCase();
      const emails = (users || [])
        .filter((u) => u.email && (userTeamId ? u.teamId === userTeamId : true))
        .map((u) => u.email!.toLowerCase())
        .filter((e) => !!e && e !== ownerEmail);
      const uniq = Array.from(new Set(emails)).sort();
      setTeamEmails(uniq);
      const preset: Record<string, boolean> = {};
      (q.sharedWithEmails || []).forEach((e) => {
        const lower = e.toLowerCase();
        if (uniq.includes(lower)) preset[lower] = true;
      });
      setSelectedEmails(preset);
      setShareForId(q.id);
    } catch (e) {
      console.error('Failed to load team emails', e);
      alert('Failed to load team emails.');
    } finally {
      setLoadingTeam(false);
    }
  };

  const closeShare = () => {
    setShareForId(null);
    setTeamEmails([]);
    setSelectedEmails({});
  };

  const applyShare = async () => {
    if (!shareForId) return;
    const q = getById(shareForId);
    if (!q) return;
    const picked = Object.keys(selectedEmails).filter((k) => selectedEmails[k]);
    try {
      await firebaseModel.update({ id: q.id, sharedWithEmails: picked }, 'questionnaires');
      // Refresh context data
      await db?.refreshData('questionnaires');
      closeShare();
    } catch (e) {
      console.error('Failed to update sharing', e);
      alert('Failed to update sharing list.');
    }
  };

  const toggleEmail = (email: string) => {
    setSelectedEmails((prev) => ({ ...prev, [email]: !prev[email] }));
  };

  const onDelete = (id: string) => {
    const q = getById(id);
    const isPredefined = !q || (q && (q.id === 'basic' || q.id === 'feedback'));
    if (isPredefined) {
      alert(t('home.predefinedWarn'));
      return;
    }
    if (confirm(t('home.confirmDelete', { name: q?.name ?? id }))) {
      remove(id);
    }
  };

  const onExport = (id: string) => {
    const q = getById(id);
    if (!q) return;
    const data = {
      id: q.id,
      name: q.name,
      description: q.description,
      questions: q.questions,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${q.id}.questionnaire.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const triggerImport = () => fileInputRef.current?.click();

  useEffect(() => {
    const handler = (_e: Event) => triggerImport();
    window.addEventListener('open-import-dialog', handler as EventListener);
    return () => {
      window.removeEventListener('open-import-dialog', handler as EventListener);
    };
  }, []);

  const onImportFileChange: React.ChangeEventHandler<HTMLInputElement> = async (
    e,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object')
        throw new Error(t('home.invalidJson'));
      if (!parsed.name || !Array.isArray(parsed.questions))
        throw new Error(t('home.missingFields'));
      // Ensure id
      let id = parsed.id as unknown | undefined;
      if (!id || typeof id !== 'string') {
        id =
          (parsed.name as string)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '') || `q-${Date.now()}`;
      }
      // Basic question normalization
      const questions = (parsed.questions as unknown[]).map((raw, idx) => {
        const q = raw as Record<string, unknown>;
        const allowedTypes = [
          'text',
          'textarea',
          'checkbox',
          'radio',
          'dropdown',
        ] as const;
        type AllowedType = (typeof allowedTypes)[number];
        const isAllowedType = (v: unknown): v is AllowedType =>
          typeof v === 'string' &&
          (allowedTypes as readonly string[]).includes(v);
        const rawType = typeof q.type === 'string' ? q.type : undefined;
        const finalType: AllowedType = isAllowedType(rawType)
          ? rawType
          : 'text';
        return {
          id: String(q.id ?? `q${idx + 1}`),
          name: String(q.name ?? `Question ${idx + 1}`),
          type: finalType,
          description:
            typeof q.description === 'string' ? q.description : undefined,
          options: Array.isArray(q.options)
            ? (q.options as unknown[]).map(String)
            : undefined,
        };
      });
      const payload = {
        id: id as string,
        name: String(parsed.name),
        description: parsed.description
          ? String(parsed.description)
          : undefined,
        questions,
      };
      upsert(payload);
      alert(t('home.imported', { name: payload.name }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('home.failedImport');
      alert(msg);
    } finally {
      // reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={onImportFileChange}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {questionnaires.map((q) => (
          <div
            key={q.id}
            className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-slate-50 dark:from-gray-800 dark:to-gray-900 p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-blue-500 flex flex-col"
          >
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              {q.name}
            </h3>
            {q.description && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                {q.description}
              </p>
            )}
            {Array.isArray(q.sharedWithEmails) && q.sharedWithEmails.length > 0 && (
              <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                Shared with: {q.sharedWithEmails.join(', ')}
              </div>
            )}
            <div className="mt-auto pt-3 border-t border-gray-100 dark:border-gray-700/60 flex gap-2 flex-nowrap items-center">
              <button
                onClick={() => navigate(`/questionnaires/${q.id}`)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium cursor-pointer rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                title={t('home.start')}
              >
                <FiPlay />
                <span>{t('home.start')}</span>
              </button>
              <div className="inline-flex flex-1"></div>
              <button
                onClick={() => openShare(q.id)}
                className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium cursor-pointer rounded-md bg-blue-600 text-white hover:bg-blue-700"
                title={t('submissions.share') || 'Share by email within team'}
              >
                <FiShare2 />
              </button>
              <button
                onClick={() => navigate(`/questionnaires/${q.id}/edit`)}
                className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium cursor-pointer rounded-md bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
                title={t('home.edit')}
              >
                <FiEdit />
              </button>
              <button
                onClick={() => onExport(q.id)}
                className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium cursor-pointer rounded-md bg-amber-500 text-white hover:bg-amber-600"
                title={t('home.export')}
              >
                <FiDownload />
              </button>
              <button
                onClick={() => onDelete(q.id)}
                className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium cursor-pointer rounded-md bg-red-600 text-white hover:bg-red-700"
                title={t('home.delete')}
              >
                <FiTrash2 />
              </button>
            </div>
          </div>
        ))}
      </div>

      {shareForId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeShare} />
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg p-5 w-full max-w-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Select teammates to share with</h3>
            {loadingTeam ? (
              <div className="text-sm text-gray-600 dark:text-gray-300">Loading team members...</div>
            ) : teamEmails.length === 0 ? (
              <div className="text-sm text-gray-600 dark:text-gray-300">No teammates found in your team.</div>
            ) : (
              <ul className="max-h-60 overflow-auto divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded">
                {teamEmails.map((email) => (
                  <li key={email} className="flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800">
                    <span className="text-sm text-gray-800 dark:text-gray-200">{email}</span>
                    <input
                      type="checkbox"
                      checked={!!selectedEmails[email]}
                      onChange={() => toggleEmail(email)}
                    />
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={closeShare}
                className="px-3 py-2 text-sm rounded bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                Cancel
              </button>
              <button
                onClick={applyShare}
                className="px-3 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Home;
