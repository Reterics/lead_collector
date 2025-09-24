import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { QuestionnaireSchema, Question } from './Questionnaire';
import { useQuestionnaireContext } from '../context/QuestionnaireContext';
import { FiChevronLeft, FiCopy, FiTrash2, FiPlus, FiSave } from 'react-icons/fi';

function newBlankQuestion(): Question {
  return {
    id: Math.random().toString(36).slice(2, 9),
    name: 'Untitled question',
    type: 'text',
    description: '',
    options: [],
  };
}

export default function QuestionnaireEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getById, upsert } = useQuestionnaireContext();

  const existing = id ? getById(id) : undefined;

  const [name, setName] = useState(existing?.name ?? 'New Questionnaire');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [questions, setQuestions] = useState<Question[]>(
    existing?.questions ?? [newBlankQuestion()],
  );
  const [error, setError] = useState<string | null>(null);

  const canSave = useMemo(() => {
    if (!name.trim()) return false;
    if (!questions.length) return false;
    for (const q of questions) {
      if (!q.name.trim()) return false;
      if ((q.type === 'radio' || q.type === 'dropdown') && (!q.options || q.options.length === 0)) return false;
    }
    return true;
  }, [name, questions]);

  const onAddQuestion = () => setQuestions((qs) => [...qs, newBlankQuestion()]);
  const onRemoveQuestion = (qid: string) => setQuestions((qs) => qs.filter(q => q.id !== qid));
  const onDupe = (qid: string) => setQuestions((qs) => {
    const idx = qs.findIndex(q => q.id === qid);
    if (idx === -1) return qs;
    const clone: Question = { ...qs[idx], id: Math.random().toString(36).slice(2, 9), name: qs[idx].name + ' (copy)' };
    const next = [...qs];
    next.splice(idx + 1, 0, clone);
    return next;
  });

  const onChangeQ = (qid: string, patch: Partial<Question>) => {
    setQuestions((qs) => qs.map(q => q.id === qid ? { ...q, ...patch, options: patch.type && (patch.type === 'radio' || patch.type === 'dropdown') && (!q.options || q.options.length === 0) ? ['Option 1'] : (patch.options ?? q.options) } : q));
  };

  const onChangeOption = (qid: string, idx: number, value: string) => {
    setQuestions(qs => qs.map(q => q.id === qid ? { ...q, options: (q.options ?? []).map((o, i) => i === idx ? value : o) } : q));
  };

  const onAddOption = (qid: string) => {
    setQuestions(qs => qs.map(q => q.id === qid ? { ...q, options: [...(q.options ?? []), `Option ${(q.options?.length ?? 0) + 1}`] } : q));
  };

  const onRemoveOption = (qid: string, idx: number) => {
    setQuestions(qs => qs.map(q => q.id === qid ? { ...q, options: (q.options ?? []).filter((_, i) => i !== idx) } : q));
  };

  const onSave = () => {
    try {
      setError(null);
      const payload: QuestionnaireSchema = { name: name.trim(), questions };
      const targetId = (existing?.id ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')) || 'questionnaire';
      upsert({ id: targetId, description, ...payload });
      navigate(`/questionnaires/${targetId}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to save';
      setError(msg);
    }
  };

  return (
    <section className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6">
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{existing ? 'Edit' : 'Create'} Questionnaire</h2>
          <div className="flex items-center gap-2">
            <Link to="/" className="inline-flex items-center gap-2 text-blue-600 hover:underline" title="Back">
              <FiChevronLeft />
              <span>Back</span>
            </Link>
          </div>
        </div>

        <div className="space-y-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2" />
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {questions.map((q, idx) => (
            <div key={q.id} className="group relative overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Question {idx + 1}</h3>
                <div className="flex gap-2">
                  <button onClick={() => onDupe(q.id)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200" title="Duplicate">
                    <FiCopy />
                    <span className="hidden sm:inline">Duplicate</span>
                  </button>
                  <button onClick={() => onRemoveQuestion(q.id)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-600 text-white" title="Remove">
                    <FiTrash2 />
                    <span className="hidden sm:inline">Remove</span>
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs text-gray-700 dark:text-gray-300">Label</label>
                  <input value={q.name} onChange={e => onChangeQ(q.id, { name: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs text-gray-700 dark:text-gray-300">Type</label>
                  <select value={q.type} onChange={e => onChangeQ(q.id, { type: e.target.value as Question['type'] })} className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2">
                    <option value="text">Text</option>
                    <option value="textarea">Textarea</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="radio">Radio</option>
                    <option value="dropdown">Dropdown</option>
                  </select>
                </div>
              </div>

              <div className="mt-3">
                <label className="block text-xs text-gray-700 dark:text-gray-300">Description (optional)</label>
                <input value={q.description ?? ''} onChange={e => onChangeQ(q.id, { description: e.target.value })} className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-2" />
              </div>

              {(q.type === 'radio' || q.type === 'dropdown') && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Options</label>
                    <button onClick={() => onAddOption(q.id)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-600 text-white" title="Add option">
                      <FiPlus />
                      <span className="hidden sm:inline">Add option</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(q.options ?? []).map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <input value={opt} onChange={e => onChangeOption(q.id, i, e.target.value)} className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white px-3 py-1.5" />
                        <button onClick={() => onRemoveOption(q.id, i)} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-600 text-white" title="Remove option">
                          <FiTrash2 />
                          <span className="hidden sm:inline">Remove</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={onAddQuestion} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white" title="Add question">
            <FiPlus />
            <span>Add question</span>
          </button>
          <button onClick={onSave} disabled={!canSave} className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 text-white disabled:opacity-60" title="Save">
            <FiSave />
            <span>Save</span>
          </button>
        </div>

        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      </div>
    </section>
  );
}
