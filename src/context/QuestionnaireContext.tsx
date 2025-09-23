/* eslint-disable react-refresh/only-export-components */
import React, {createContext, useContext, useMemo, useState} from 'react';
import type { QuestionnaireSchema } from '../components/Questionnaire';

export type QuestionnaireDef = QuestionnaireSchema & {
  id: string;
  description?: string;
};

type QuestionnaireContextValue = {
  questionnaires: QuestionnaireDef[];
  currentId: string | null;
  selectById: (id: string | null) => void;
  getById: (id: string) => QuestionnaireDef | undefined;
};

const QuestionnaireContext = createContext<QuestionnaireContextValue | undefined>(undefined);

// Example predefined questionnaires
const PREDEFINED: QuestionnaireDef[] = [
  {
    id: 'basic',
    name: 'Basic Lead Form',
    description: 'Collects basic contact details and preferences.',
    questions: [
      { id: 'name', name: 'Name', type: 'text', description: 'Your full name' },
      { id: 'email', name: 'Email', type: 'text', description: 'Contact email' },
      { id: 'contact', name: 'Preferred contact', type: 'radio', options: ['Email', 'Phone'] },
      { id: 'notes', name: 'Notes', type: 'textarea' },
    ],
  },
  {
    id: 'feedback',
    name: 'Website Feedback',
    description: 'Quick feedback about your experience on our site.',
    questions: [
      { id: 'satisfaction', name: 'Satisfaction', type: 'dropdown', options: ['1', '2', '3', '4', '5'] },
      { id: 'would_recommend', name: 'Would you recommend us?', type: 'radio', options: ['No', 'Yes'] },
      { id: 'details', name: 'Details', type: 'textarea' },
    ],
  },
];

export const QuestionnaireProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [currentId, setCurrentId] = useState<string | null>(null);

  const value = useMemo<QuestionnaireContextValue>(() => ({
    questionnaires: PREDEFINED,
    currentId,
    selectById: setCurrentId,
    getById: (id: string) => PREDEFINED.find(q => q.id === id),
  }), [currentId]);

  return (
    <QuestionnaireContext.Provider value={value}>
      {children}
    </QuestionnaireContext.Provider>
  );
};

export function useQuestionnaireContext(): QuestionnaireContextValue {
  const ctx = useContext(QuestionnaireContext);
  if (!ctx) throw new Error('useQuestionnaireContext must be used within QuestionnaireProvider');
  return ctx;
}

export function useQuestionnaires() {
  return useQuestionnaireContext().questionnaires;
}

export function useCurrentQuestionnaire() {
  const { currentId, getById } = useQuestionnaireContext();
  return currentId ? getById(currentId) : undefined;
}

