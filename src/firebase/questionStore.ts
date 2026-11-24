import type { User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { GameQuestion } from '../game/types';
import { db, handleFirestoreError, isVerifiedAdminUser, OperationType } from './client';
import {
  buildFirestoreQuestionFields,
  firestoreDocToQuestion,
  sanitizeDocId,
} from './questionCodec';

export async function loadPublishedCurriculumOverrides(): Promise<Record<string, GameQuestion>> {
  const path = 'curriculum_overrides';
  try {
    const q = query(collection(db, path), where('isPublished', '==', true));
    const snap = await getDocs(q);
    const out: Record<string, GameQuestion> = {};
    snap.forEach((docSnap) => {
      const parsed = firestoreDocToQuestion(docSnap.data());
      if (parsed) {
        out[parsed.id] = parsed;
      }
    });
    return out;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function loadTeacherPrivateOverrides(uid: string): Promise<Record<string, GameQuestion>> {
  const path = 'teacher_overrides';
  try {
    const q = query(collection(db, path), where('ownerId', '==', uid));
    const snap = await getDocs(q);
    const out: Record<string, GameQuestion> = {};
    snap.forEach((docSnap) => {
      const parsed = firestoreDocToQuestion(docSnap.data());
      if (parsed) {
        out[parsed.id] = parsed;
      }
    });
    return out;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function loadTeacherCustomQuestions(uid: string): Promise<GameQuestion[]> {
  const path = 'teacher_custom_questions';
  try {
    const q = query(collection(db, path), where('ownerId', '==', uid));
    const snap = await getDocs(q);
    const rows: Array<{ sortOrder: number; question: GameQuestion }> = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const parsed = firestoreDocToQuestion(data);
      if (parsed) {
        rows.push({
          sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 999,
          question: parsed,
        });
      }
    });
    rows.sort((a, b) => a.sortOrder - b.sortOrder);
    return rows.map((r) => r.question);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveCurriculumOverrideToCloud(user: User, question: GameQuestion): Promise<void> {
  const core = buildFirestoreQuestionFields(question);
  const isAdmin = isVerifiedAdminUser(user);
  const colName = isAdmin ? 'curriculum_overrides' : 'teacher_overrides';
  const docId = isAdmin ? core.id : sanitizeDocId(`${user.uid}_${core.id}`);
  const fullPath = `${colName}/${docId}`;
  const ref = doc(db, colName, docId);

  try {
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      const updatePayload: Record<string, unknown> = {
        mode: core.mode,
        difficulty: core.difficulty,
        topic: core.topic,
        timeLimitSec: core.timeLimitSec,
        ruleHint: core.ruleHint,
        explanation: core.explanation,
        questionData: core.questionData,
        updatedAt: serverTimestamp(),
      };
      if (isAdmin) {
        updatePayload.isPublished = true;
      }
      await updateDoc(ref, updatePayload);
    } else {
      const createPayload: Record<string, unknown> = {
        ...core,
        ownerId: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (isAdmin) {
        createPayload.isPublished = true;
      }
      await setDoc(ref, createPayload);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, fullPath);
  }
}

export async function deleteCurriculumOverrideFromCloud(user: User, questionId: string): Promise<void> {
  const cleanId = sanitizeDocId(questionId);
  const isAdmin = isVerifiedAdminUser(user);
  const colName = isAdmin ? 'curriculum_overrides' : 'teacher_overrides';
  const docId = isAdmin ? cleanId : sanitizeDocId(`${user.uid}_${cleanId}`);
  const fullPath = `${colName}/${docId}`;
  try {
    await deleteDoc(doc(db, colName, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, fullPath);
  }
}

export async function syncCustomQuestionsToCloud(user: User, questions: GameQuestion[]): Promise<void> {
  const colName = 'teacher_custom_questions';
  try {
    const existingSnap = await getDocs(
      query(collection(db, colName), where('ownerId', '==', user.uid))
    );
    const existingIds = new Set<string>();
    existingSnap.forEach((d) => existingIds.add(d.id));

    const keepIds = new Set<string>();

    for (let i = 0; i < Math.min(30, questions.length); i++) {
      const core = buildFirestoreQuestionFields(questions[i]);
      const docId = sanitizeDocId(`${user.uid}_${core.id}`);
      keepIds.add(docId);
      const ref = doc(db, colName, docId);

      if (existingIds.has(docId)) {
        await updateDoc(ref, {
          mode: core.mode,
          difficulty: core.difficulty,
          topic: core.topic,
          timeLimitSec: core.timeLimitSec,
          ruleHint: core.ruleHint,
          explanation: core.explanation,
          questionData: core.questionData,
          sortOrder: i,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(ref, {
          ...core,
          sortOrder: i,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }

    for (const oldId of existingIds) {
      if (!keepIds.has(oldId)) {
        await deleteDoc(doc(db, colName, oldId));
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, colName);
  }
}
