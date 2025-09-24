import React, { useContext, useRef } from 'react';
import { useQuestionnaireContext } from '../context/QuestionnaireContext.tsx';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext.tsx';
import { FiUpload, FiDownload, FiTrash2, FiEdit, FiLogOut, FiPlay } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

const Home: React.FC = () => {
  const { questionnaires, remove, getById, upsert } = useQuestionnaireContext();
  const navigate = useNavigate();
  const { SignOut } = useContext(AuthContext);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { t } = useTranslation();

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
    const data = { id: q.id, name: q.name, description: q.description, questions: q.questions };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
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

  const onImportFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object') throw new Error(t('home.invalidJson'));
      if (!parsed.name || !Array.isArray(parsed.questions)) throw new Error(t('home.missingFields'));
      // Ensure id
      let id = parsed.id as unknown | undefined;
      if (!id || typeof id !== 'string') {
        id = (parsed.name as string).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `q-${Date.now()}`;
      }
      // Basic question normalization
      const questions = (parsed.questions as unknown[]).map((raw, idx) => {
        const q = raw as Record<string, unknown>;
        const allowedTypes = ['text','textarea','checkbox','radio','dropdown'] as const;
        type AllowedType = typeof allowedTypes[number];
        const isAllowedType = (v: unknown): v is AllowedType => typeof v === 'string' && (allowedTypes as readonly string[]).includes(v);
        const rawType = typeof q.type === 'string' ? q.type : undefined;
        const finalType: AllowedType = isAllowedType(rawType) ? rawType : 'text';
        return {
          id: String(q.id ?? `q${idx + 1}`),
          name: String(q.name ?? `Question ${idx + 1}`),
          type: finalType,
          description: typeof q.description === 'string' ? q.description : undefined,
          options: Array.isArray(q.options) ? (q.options as unknown[]).map(String) : undefined,
        };
      });
      const payload = { id: id as string, name: String(parsed.name), description: parsed.description ? String(parsed.description) : undefined, questions };
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
    <section className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{t('home.choose')}</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => SignOut()}
              className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-md bg-gray-600 text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              title={t('auth.logout')}
            >
              <FiLogOut />
              <span className="hidden sm:inline">{t('auth.logout')}</span>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link to="/questionnaires/new" className="px-4 py-2 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700">{t('home.new')}</Link>
            <Link to="/submissions" className="px-4 py-2 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700">{t('home.submissions')}</Link>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={triggerImport} className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white" title="Import questionnaire JSON" aria-label="Import">
              <FiUpload />
              <span className="hidden sm:inline">{t('home.importJson')}</span>
            </button>
            <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={onImportFileChange} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {questionnaires.map((q) => (
            <div
              key={q.id}
              className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-white to-slate-50 dark:from-gray-800 dark:to-gray-900 p-5 shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 focus-within:ring-2 focus-within:ring-blue-500 flex flex-col"
            >
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">{q.name}</h3>
              {q.description && (
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{q.description}</p>
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
      </div>
    </section>
  );
};

export default Home;
