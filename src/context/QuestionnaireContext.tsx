import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { QuestionnaireSchema } from '../pages/Questionnaire.tsx';

export type QuestionnaireDef = QuestionnaireSchema & {
  id: string;
  description?: string;
};

type QuestionnaireContextValue = {
  questionnaires: QuestionnaireDef[];
  currentId: string | null;
  selectById: (id: string | null) => void;
  getById: (id: string) => QuestionnaireDef | undefined;
  upsert: (q: QuestionnaireDef) => void;
  remove: (id: string) => void;
};

const QuestionnaireContext = createContext<
  QuestionnaireContextValue | undefined
>(undefined);

// Example predefined questionnaires
const PREDEFINED: QuestionnaireDef[] = [
  {
    id: 'basic',
    name: 'Basic Lead Form',
    description: 'Collects basic contact details and preferences.',
    questions: [
      { id: 'name', name: 'Name', type: 'text', description: 'Your full name' },
      {
        id: 'email',
        name: 'Email',
        type: 'text',
        description: 'Contact email',
      },
      {
        id: 'contact',
        name: 'Preferred contact',
        type: 'radio',
        options: ['Email', 'Phone'],
      },
      { id: 'notes', name: 'Notes', type: 'textarea' },
    ],
  },
  {
    id: 'feedback',
    name: 'Website Feedback',
    description: 'Quick feedback about your experience on our site.',
    questions: [
      {
        id: 'satisfaction',
        name: 'Satisfaction',
        type: 'dropdown',
        options: ['1', '2', '3', '4', '5'],
      },
      {
        id: 'would_recommend',
        name: 'Would you recommend us?',
        type: 'radio',
        options: ['No', 'Yes'],
      },
      { id: 'details', name: 'Details', type: 'textarea' },
    ],
  },
];

const STORAGE_KEY = 'lead_collector.questionnaires';

export const QuestionnaireProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [custom, setCustom] = useState<QuestionnaireDef[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as QuestionnaireDef[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
    } catch {
      // ignore storage errors
    }
  }, [custom]);

  const all = useMemo(() => {
    // de-duplicate by id (custom overrides predefined)
    const map = new Map<string, QuestionnaireDef>();
    for (const q of PREDEFINED) map.set(q.id, q);
    for (const q of custom) map.set(q.id, q);
    return Array.from(map.values());
  }, [custom]);

  const value = useMemo<QuestionnaireContextValue>(
    () => ({
      questionnaires: all,
      currentId,
      selectById: setCurrentId,
      getById: (id: string) => all.find((q) => q.id === id),
      upsert: (q: QuestionnaireDef) => {
        setCustom((prev) => {
          const idx = prev.findIndex((x) => x.id === q.id);
          if (idx === -1) return [...prev, q];
          const next = [...prev];
          next[idx] = q;
          return next;
        });
      },
      remove: (id: string) => {
        setCustom((prev) => prev.filter((x) => x.id !== id));
      },
    }),
    [all, currentId],
  );

  return (
    <QuestionnaireContext.Provider value={value}>
      {children}
    </QuestionnaireContext.Provider>
  );
};

export function useQuestionnaireContext(): QuestionnaireContextValue {
  const ctx = useContext(QuestionnaireContext);
  if (!ctx)
    throw new Error(
      'useQuestionnaireContext must be used within QuestionnaireProvider',
    );
  return ctx;
}

export function useQuestionnaires() {
  return useQuestionnaireContext().questionnaires;
}

export function useCurrentQuestionnaire() {
  const { currentId, getById } = useQuestionnaireContext();
  return currentId ? getById(currentId) : undefined;
}
