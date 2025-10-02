import type { CommonCollectionData } from '../firebase.tsx';
import { getDownloadURL, getStorage, ref as storageRef, uploadBytes } from 'firebase/storage';
import { firebaseModel } from '../../config.ts';
import type {
  Question,
  QuestionnaireSchema,
} from '../../pages/Questionnaire.tsx';

export type VoiceRecordings = Record<string, Blob | null>

export type QuestionnaireStatus = 'created' | 'local' | 'firestore' | 'jira' |  'auth' | 'unknown';

export interface BaseItem extends CommonCollectionData {
  createdAt: string
  questionnaireName: string,
  summary: string
  description: string
  status: QuestionnaireStatus
  issueKey?: string
  issueUrl?: string
  values: Answers
  questions: Partial<Question>[]
  recordingUrls?: Record<string, string>
}

export type Answers = Record<string, string | boolean>

const formatDescription = (
  questions: Partial<Question>[],
  values: Answers,
  recordingUrls?: Record<string, string>,
): string => {
  const parts: string[] = [];
  parts.push('Questionnaire responses');
  parts.push('');
  for (let i = 0; i < questions.length; i++){
    const q = questions[i];
    const qId = i+1;
    if (!q?.id) continue;
    const raw = values[q.id];
    const answer = Array.isArray(raw) ? raw.join(', ') : String(raw);
    parts.push(`${(qId)}.Q: ${q.name || q.id}`);
    parts.push(`${(qId)}.A: ${answer}`);
    const url = recordingUrls?.[q.id];
    if (url) {
      parts.push(`Recording: ${url}`);
    }
    parts.push('');
  }
  return parts.join('\n');
};

export const createBaseItem = (schema: QuestionnaireSchema, values: Answers): BaseItem => {
  // Use the first text input's value as the JIRA title (summary) when available
  const firstTextQuestion = schema.questions.find((q) => q.type === 'text');
  const firstTextValueRaw = firstTextQuestion?.id ? values[firstTextQuestion.id] : undefined;
  const firstTextValue = typeof firstTextValueRaw === 'string' ? firstTextValueRaw.trim() : '';
  const fallbackSummary = `${schema.name} response - ${new Date().toLocaleString()}`;
  const summary = firstTextValue || fallbackSummary;

  const description = formatDescription(schema.questions, values);

  const id =
    typeof window !== 'undefined' &&
    typeof window.crypto?.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  return {
    id: id,
    createdAt: new Date().toISOString(),
    questionnaireName: schema.name,
    summary,
    description,
    status: 'created',
    values,
    questions: schema.questions.map((q) => ({
      id: q.id,
      name: q.name,
      type: q.type,
    })),
  }
}

export const saveToFirebaseStorage = async (baseItem: BaseItem, recordings: VoiceRecordings, schema: QuestionnaireSchema) => {
  if (!baseItem.id) {
    throw new Error('Missing required parameters: id');
  }
  try {
    const storage = getStorage(firebaseModel.getApp());
    const recordingUrls: Record<string, string> = {};
    for (const [qid, blob] of Object.entries(recordings)) {
      if (!blob) continue;
      const questionNumber = schema.questions.findIndex(question => question.id === qid);
      const questionId = questionNumber !== -1 ? (questionNumber + 1) : qid;

      const path = `submissions/${baseItem.id}/question-${questionId}-${Date.now()}.webm`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, blob, {
        contentType: blob.type || 'audio/webm',
      });
      recordingUrls[qid] = await getDownloadURL(ref);
    }
    if (Object.keys(recordingUrls).length > 0) {
      baseItem.recordingUrls = recordingUrls;
      // Rebuild description to include recording URLs per question
      baseItem.description = formatDescription(baseItem.questions, baseItem.values, recordingUrls);
      await firebaseModel.update(baseItem, 'submissions');
    }
  } catch (uploadErr) {
    console.error('Failed to upload recordings to Firebase Storage (error path)', uploadErr);
  }

}


export const saveToFirestore = async (baseItem: BaseItem) => {
  await firebaseModel.update(baseItem, 'submissions');
  return true;
}
