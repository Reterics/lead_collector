import { useContext, useMemo, useState } from 'react';
import type { QuestionnaireSchema } from '../pages/Questionnaire.tsx';
import { DBContext } from './DBContext';
import type { ContextDataValueType } from '../services/firebase.tsx';

export type QuestionnaireDef = QuestionnaireSchema & {
  id: string;
  description?: string;
  ownerId?: string;
  ownerEmail?: string;
  teamId?: string;
  sharedWithEmails?: string[];
};

type QuestionnaireContextValue = {
  questionnaires: QuestionnaireDef[];
  currentId: string | null;
  selectById: (id: string | null) => void;
  getById: (id: string) => QuestionnaireDef | undefined;
  upsert: (q: QuestionnaireDef) => void;
  remove: (id: string) => void;
};

// Merged hook: relies solely on FirebaseProvider (DBContext)
export function useQuestionnaireContext(): QuestionnaireContextValue {
  const db = useContext(DBContext);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const all = useMemo(() => {
    const firebaseQuestionnaires = (db?.data?.questionnaires ??
      []) as unknown[];
    // Convert Firebase entries to QuestionnaireDef when shape matches
    return firebaseQuestionnaires
      .map((raw) => {
        const x = raw as Record<string, unknown>;
        if (
          typeof x.id === 'string' &&
          typeof x.name === 'string' &&
          Array.isArray(x.questions)
        ) {
          return x as unknown as QuestionnaireDef;
        }
        return null;
      })
      .filter(Boolean) as QuestionnaireDef[];
  }, [db?.data?.questionnaires]);

  const value = useMemo<QuestionnaireContextValue>(
    () => ({
      questionnaires: all,
      currentId,
      selectById: setCurrentId,
      getById: (id: string) => all.find((q) => q.id === id),
      upsert: (q: QuestionnaireDef) => {
        // Fire-and-forget write to Firebase via DBContext
        const currentUser = db?.data?.currentUser;
        const stamped = {
          ...q,
          ownerId: q.ownerId || currentUser?.id,
          ownerEmail: q.ownerEmail || currentUser?.email,
          teamId: q.teamId || currentUser?.teamId || currentUser?.id,
          sharedWithEmails: Array.isArray(q.sharedWithEmails) ? q.sharedWithEmails : [],
        } as unknown as ContextDataValueType;
        db?.setData('questionnaires', stamped).catch((e) =>
          console.error('Failed to save questionnaire', e),
        );
      },
      remove: (id: string) => {
        db?.removeData('questionnaires', id).catch((e) =>
          console.error('Failed to remove questionnaire', e),
        );
      },
    }),
    [all, currentId, db],
  );

  if (!db) {
    throw new Error(
      'useQuestionnaireContext must be used within FirebaseProvider',
    );
  }

  return value;
}

export function useQuestionnaires() {
  return useQuestionnaireContext().questionnaires;
}

export function useCurrentQuestionnaire() {
  const { currentId, getById } = useQuestionnaireContext();
  return currentId ? getById(currentId) : undefined;
}
