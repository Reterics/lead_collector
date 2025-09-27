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
}

export type Answers = Record<string, string | boolean>

export const createBaseItem = (schema: QuestionnaireSchema, values: Answers): BaseItem => {
  const summary = `${schema.name} response - ${new Date().toLocaleString()}`;
  const lines: string[] = [];
  for (const q of schema.questions) {
    const val = values[q.id];
    lines.push(
      `- ${q.name}: ${Array.isArray(val) ? val.join(', ') : String(val)}`,
    );
  }
  const description = lines.join('\n');

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

export const saveToFirebaseStorage = async (baseItem: CommonCollectionData, recordings: VoiceRecordings) => {
  if (!baseItem.id) {
    throw new Error('Missing required parameters: id');
  }
  try {
    const storage = getStorage(firebaseModel.getApp());
    const recordingUrls: Record<string, string> = {};
    for (const [qid, blob] of Object.entries(recordings)) {
      if (!blob) continue;
      const path = `submissions/${baseItem.id}/recordings/${qid}-recording-${Date.now()}.webm`;
      const ref = storageRef(storage, path);
      await uploadBytes(ref, blob, {
        contentType: blob.type || 'audio/webm',
      });
      recordingUrls[qid] = await getDownloadURL(ref);
    }
    if (Object.keys(recordingUrls).length > 0) {
      baseItem.recordingUrls = recordingUrls;
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
