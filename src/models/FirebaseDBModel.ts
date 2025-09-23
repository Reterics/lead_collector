import DBModel from './DBModel.ts';
import type { FirebaseApp } from 'firebase/app';
import { initializeApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import {
  collection,
  getFirestore,
  query,
  doc,
  getDoc,
  setDoc,
  addDoc,
  getDocs,
  where,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import type { CommonCollectionData, TTLData } from '../services/firebase.tsx';
import type { User } from 'firebase/auth';

export default class FirebaseDBModel extends DBModel {
  protected _app: FirebaseApp;
  protected _db: Firestore;
  protected _user: User | null | undefined;
  protected _logFailCount: number;

  constructor(options?: {
    ttl?: TTLData;
    mtime?: TTLData;
    enableLogs?: boolean;
    transactions?: boolean;
    collectionsToLog?: string[];
  }) {
    super(options);
    this._app = initializeApp({
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGE_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
    });
    this._db = getFirestore(this._app);
    this._logFailCount = 0;
  }

  setUser(user: User | null | undefined) {
    this._user = user;
  }

  getApp() {
    return this._app;
  }

  getDB() {
    return this._db;
  }

  async getAll(
    table: string,
    force?: boolean,
  ): Promise<CommonCollectionData[]> {
    let after = force ? 0 : this.getMTime(table);
    const now = new Date().getTime();
    const five = 5000;
    const cached = this.getCached(table);

    // Inside 5 seconds timeframe we have purely the cache
    if (cached && now - five <= after) {
      return cached;
    }
    if (!cached) {
      // If there is no cache, then we need all data
      after = 0;
    }
    // There is no deleted table in DB
    if (table === 'deleted') {
      return cached || [];
    }
    const receivedData: CommonCollectionData[] = cached || [];

    try {
      // Apply a condition to only get documents where docUpdated > after the last cache modification
      console.log(
        'Get update for ' +
          table +
          ' after ' +
          new Date(after).toISOString().split('T')[0],
      );
      const q = after
        ? query(collection(this._db, table), where('docUpdated', '>', after))
        : query(collection(this._db, table));
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((doc) => {
        const indexOf = receivedData.findIndex((data) => data.id === doc.id);
        const data = doc.data();
        if (data && !data.deleted) {
          if (indexOf !== -1) {
            receivedData[indexOf] = { ...data, id: doc.id };
          } else {
            receivedData.push({ ...data, id: doc.id });
          }
        } else if (data?.deleted && indexOf !== -1) {
          this.updateCachedEntry(doc.id, 'deleted', { ...data, id: doc.id });
          receivedData.splice(indexOf, 1);
        } else if (data?.deleted) {
          this.appendCachedEntry('deleted', { ...data, id: doc.id });
        }
      });
      this.updateCache(table, receivedData);
      this.sync();
      return receivedData;
    } catch (error) {
      console.error('Error happened during Firebase connection: ', error);
      return [];
    }
  }

  async get(id: string, table: string): Promise<unknown> {
    const docRef = doc(this._db, table, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      this.updateCachedEntry(id, table, data as CommonCollectionData);
      return data;
    }
    return null;
  }

  async remove(id: string, table: string): Promise<void> {
    const cached = this.getCachedEntry(id, table);
    // There must be a cached entry, otherwise we would not show it in UI
    if (cached) {
      const modelRef = doc(this._db, table, id);
      cached.deleted = true;
      cached.docUpdated = new Date().getTime();
      cached.docType = table;
      Object.keys(cached).forEach((key) => {
        if (cached[key] === undefined) {
          delete cached[key];
        }
      });
      await setDoc(modelRef, cached, { merge: true }).catch((e) => {
        console.error(e);
      });
      this.updateCachedEntry(id, 'deleted', { ...cached, id });
      this.removeCachedEntry(id, table);
      this.sync();
    } else {
      // Data is not available anymore (ui error or multiple function calls)
    }
  }

  async restore(id: string): Promise<boolean> {
    /*if (this._enableLogs) {
                return !!(await this.removePermanent(id));
            }*/
    const cached = this.getCachedEntry(id, 'deleted');
    // There must be a cached entry, otherwise we would not show it in UI
    if (cached) {
      const target = cached.docType as string;
      if (!target) {
        return false;
      }
      const modelRef = doc(this._db, target, id);
      cached.deleted = false;
      cached.docUpdated = new Date().getTime();
      await setDoc(modelRef, cached, { merge: true }).catch((e) => {
        console.error(e);
      });
      this.updateCachedEntry(id, target, { ...cached, id });
      this.removeCachedEntry(id, 'deleted');
      this.sync();
      return true;
    } else {
      return false;
      // Data is not available anymore (ui error or multiple function calls)
    }
  }

  async removePermanent(id: string): Promise<CommonCollectionData[] | null> {
    const cached = this.getCachedEntry(id, 'deleted');
    if (cached && cached.docType) {
      await deleteDoc(doc(this._db, cached.docType as string, id));
      this.removeCachedEntry(id, 'deleted');
    }
    if (cached && !cached.docType) {
      console.error('Failed to determine document type');
    }
    // Keep sync here to make sure the data is persisted
    this.sync();
    return this.getAll('deleted');
  }

  async removeAllPermanent(
    idList: string[],
  ): Promise<CommonCollectionData[] | null> {
    if (idList.length === 0) return this.getAll('deleted');

    // Firebase has a limit of 500 operations per batch
    const BATCH_LIMIT = 500;
    let currentBatch = writeBatch(this._db);
    let operationCount = 0;

    for (const id of idList) {
      const cached = this.getCachedEntry(id, 'deleted');
      if (cached && cached.docType) {
        currentBatch.delete(doc(this._db, cached.docType as string, id));
        this.removeCachedEntry(id, 'deleted');
        operationCount++;

        // If we've reached the batch limit, commit the current batch and start a new one
        if (operationCount >= BATCH_LIMIT) {
          await currentBatch.commit();
          currentBatch = writeBatch(this._db);
          operationCount = 0;
        }
      } else if (cached) {
        console.error(`Cannot delete ${id}: invalid docType`);
      } else {
        console.error(`Cannot delete ${id}: missing`);
      }
    }

    // Commit any remaining operations
    if (operationCount > 0) {
      await currentBatch.commit();
    }

    this.sync();
    return this.getAll('deleted');
  }

  async update(item: CommonCollectionData, table: string): Promise<void> {
    if (!item) {
      return;
    }

    let modelRef;
    let imageCache;

    if (item && item.id) {
      // If item has an ID, update the existing document
      modelRef = doc(this._db, table, item.id as string);

      if (
        'image' in item &&
        item.image &&
        (item.image as string).startsWith('https://firebase')
      ) {
        imageCache = item.image;
        delete item.image;
      }
    } else {
      // Generate a new document reference with an auto-generated ID
      modelRef = doc(collection(this._db, table));
      item.id = modelRef.id; // Assign the generated ID to your item
    }

    if (item) {
      item.docUpdated = new Date().getTime();
    }

    // Use setDoc with { merge: true } to update or create the document
    await setDoc(modelRef, item, { merge: true }).catch((e) => {
      console.error(e);
    });

    if (item && imageCache) {
      item.image = imageCache;
    }
    // We must wait to not interfere with updateCachedEntry
    this.updateCachedEntry(
      item.id as string,
      table,
      item as CommonCollectionData,
    );
    this.sync();
  }

  async updateAll(items: CommonCollectionData[], table: string): Promise<void> {
    // Firebase has a limit of 500 operations per batch
    const BATCH_LIMIT = 500;
    let currentBatch = writeBatch(this._db);
    let operationCount = 0;
    let modelRef;

    for (const item of items) {
      if (!item) {
        continue;
      }
      let imageCache;

      if (item && item.id) {
        // If item has an ID, update the existing document
        modelRef = doc(this._db, table, item.id as string);

        if (
          'image' in item &&
          item.image &&
          (item.image as string).startsWith('https://firebase')
        ) {
          imageCache = item.image;
          delete item.image;
        }
      } else {
        // Generate a new document reference with an auto-generated ID
        modelRef = doc(collection(this._db, table));
        item.id = modelRef.id; // Assign the generated ID to your item
      }

      if (item) {
        item.docUpdated = new Date().getTime();
      }

      currentBatch.set(modelRef, item, { merge: true });
      operationCount++;

      // If we've reached the batch limit, commit the current batch and start a new one
      if (operationCount >= BATCH_LIMIT) {
        await currentBatch.commit();
        currentBatch = writeBatch(this._db);
        operationCount = 0;
      }

      if (item && imageCache) {
        item.image = imageCache;
      }
      this.updateCachedEntry(
        item.id as string,
        table,
        item as CommonCollectionData,
      );
    }

    // Commit any remaining operations
    if (operationCount > 0) {
      await currentBatch.commit();
    }

    this.sync();
  }

  async add(
    item: { [key: string]: unknown },
    table: string,
  ): Promise<void | string> {
    if (!item) {
      return;
    }
    const modelRef = await addDoc(collection(this._db, table), item).catch(
      (e) => {
        console.error(e);
      },
    );
    if (modelRef) {
      item.id = modelRef.id;
    }
    this.appendCachedEntry(table, item as CommonCollectionData);
    this.sync();

    return item.id as string | undefined;
  }
}
