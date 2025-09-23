import type { ReactNode } from 'react';
import { useContext, useEffect, useRef, useState } from 'react';

import {
  firebaseCollections,
  firebaseModel,
  getCollection,
} from '../config.ts';

import PageLoading from '../components/PageLoading.tsx';
import { DBContext } from '../context/DBContext.ts';
import { AuthContext } from '../context/AuthContext.tsx';
import UnauthorizedComponent from '../components/Unauthorized.tsx';

export interface GeneralCollectionEntry {
  docType?: ContextDataType;
  docParent?: string;
  docUpdated?: number;
  deleted?: boolean;
}

export interface UserData extends GeneralCollectionEntry {
  username?: string;
  email?: string;
  role?: string;
  id: string;
  password?: string;
  password_confirmation?: string;
}

export interface CommonCollectionData {
  id: string;
  [key: string]: string | number | boolean | undefined;
}

export interface KVCollectionStore {
  [key: string]: CommonCollectionData[];
}

export interface TTLData {
  [key: string]: number;
}

type ContextDataType = 'questionnaires';

export type ContextDataValueType = CommonCollectionData;

export interface ContextData {
  questionnaires: CommonCollectionData[];
  deleted: ContextDataValueType[];
  users: UserData[];
  currentUser?: UserData;
}

export type ContextDataCollectionType =
  | CommonCollectionData[]
  | UserData[]
  | UserData;

export interface DBContextType {
  data: ContextData;
  refreshData: (key?: ContextDataType) => Promise<void>;
  setData: (
    key: ContextDataType,
    value: ContextDataValueType,
    archive?: boolean,
  ) => Promise<ContextDataCollectionType | null>;
  removeData: (
    key: ContextDataType,
    id: string,
  ) => Promise<ContextDataCollectionType | null>;
  restoreData: (id: string) => Promise<ContextDataCollectionType | null>;
  removePermanentData: (id: string) => Promise<ContextDataValueType[] | null>;
  removePermanentDataList: (
    id: string[],
  ) => Promise<ContextDataValueType[] | null>;
  uploadDataBatch: (
    key: ContextDataType,
    values: ContextDataValueType[],
  ) => Promise<ContextDataCollectionType | null>;
  updateLatest: (
    key: ContextDataType,
  ) => Promise<ContextDataValueType[] | null>;
}

export const FirebaseProvider = ({ children }: { children: ReactNode }) => {
  const authContext = useContext(AuthContext);
  const [ctxData, setCtxData] = useState<ContextData | null>(null);
  const renderAfterCalled = useRef(false);

  const getContextData = async (cache: boolean = false) => {
    let users = (await getCollection(
      firebaseCollections.users,
      true,
    )) as unknown as UserData[];
    let user;
    let questionnaires: CommonCollectionData[] = [];

    users = users.map((user) => {
      user.password = undefined;
      user.password_confirmation = undefined;
      return user;
    });

    if (authContext.user?.email) {
      user = users.find((user) => user.email === authContext.user?.email);

      if (!user) {
        console.error('User is not found in the Firestore settings, set it to regular user');
        user = {
            id: authContext.user?.uid,
            email: authContext.user?.email,
            username: authContext.user?.email,
            role: 'user',
            password: undefined,
            password_confirmation: undefined,
        }
      } else if (user.role !== 'admin') {
        console.log('User is not an admin, hence we do not load settings');
        users = [user];
      }
    }

    if (user) {
      questionnaires = (await getCollection(
        firebaseCollections.questionnaires,
      )) as CommonCollectionData[];
    }

    if (cache) {
      firebaseModel.sync(0);
    }
    setCtxData({
      questionnaires,
      users,
      currentUser: user,
      deleted: await firebaseModel.getAll('deleted'),
    });
  };

  const removeContextData = async (key: ContextDataType, id: string) => {
    if (ctxData && Array.isArray(ctxData[key])) {
      const filteredData = ctxData[key].filter((item) => item.id !== id);
      if (filteredData.length !== ctxData[key].length) {
        await firebaseModel.remove(id, firebaseCollections[key]);
        ctxData[key] = [...filteredData];
        const cachedRecycleBin = firebaseModel.getCached('deleted');
        if (cachedRecycleBin) {
          ctxData.deleted = cachedRecycleBin;
        }

        setCtxData({
          ...ctxData,
        });
        return ctxData[key];
      }
    }

    return ctxData ? ctxData[key] : null;
  };

  const restoreContextData = async (id: string) => {
    if (ctxData && ctxData.deleted) {
      await firebaseModel.restore(id);
      const filteredData = ctxData.deleted.filter((item) => item.id !== id);
      ctxData.deleted = [...filteredData];
      setCtxData({
        ...ctxData,
      });
      return ctxData.deleted;
    }
    return ctxData ? ctxData.deleted : null;
  };

  const removePermanentCtxData = async (id: string) => {
    const deleted = await firebaseModel.removePermanent(id);
    if (ctxData && ctxData.deleted && deleted) {
      ctxData.deleted = [...deleted];
      setCtxData({
        ...ctxData,
      });
    }
    return deleted;
  };

  const removePermanentCtxDataList = async (id: string[]) => {
    const deleted = await firebaseModel.removeAllPermanent(id);
    if (ctxData && ctxData.deleted && deleted) {
      ctxData.deleted = [...deleted];
      setCtxData({
        ...ctxData,
      });
    }
    return deleted;
  };

  const updateContextData = async (
    key: ContextDataType,
    item: ContextDataValueType,
  ) => {
    if (!item) {
      console.error('There is no data provided for saving');
      return ctxData ? ctxData[key] : null;
    }

    await firebaseModel.update(item, key);

    console.log('Created document with ID:', item.id, ' in ', key);

    if (ctxData) {
      // FirebaseModel above build up the cache, so we need just to refresh data from it here
      const cachedData = firebaseModel.getCached(key);
      if (cachedData) {
        ctxData[key] = cachedData;
      } else {
        console.warn('Failed to fetch data from local cache');
      }
    }

    setCtxData(
      ctxData
        ? {
            ...ctxData,
          }
        : null,
    );

    return ctxData ? ctxData[key] : null;
  };

  const updateContextBatched = async (
    key: ContextDataType,
    items: ContextDataValueType[],
  ) => {
    await firebaseModel.updateAll(items, key);

    if (ctxData) {
      // FirebaseModel above build up the cache, so we need just to refresh data from it here
      const cachedData = firebaseModel.getCached(key);
      if (cachedData) {
        ctxData[key] = cachedData;
      } else {
        console.warn('Failed to fetch data from local cache');
      }
    }

    setCtxData(
      ctxData
        ? {
            ...ctxData,
          }
        : null,
    );

    return ctxData ? ctxData[key] : null;
  };

  const refreshData = async (key?: ContextDataType) => {
    let updateLocalCache = false;
    if (key) {
      firebaseModel.invalidateCache(key);
      updateLocalCache = true;
    }
    await getContextData(updateLocalCache);
  };

  const updateLatestContext = async (key: ContextDataType) => {
    // Validation step
    if (ctxData) {
      ctxData[key] = await getCollection(firebaseCollections[key]);
    }
    setCtxData(
      ctxData
        ? {
            ...ctxData,
          }
        : null,
    );

    return ctxData ? ctxData[key] : null;
  };

  useEffect(() => {
    if (!renderAfterCalled.current) {
      console.log('Load context data');
      firebaseModel
        .loadPersisted()
        .finally(() => getContextData(true))
        .finally(() => firebaseModel.setUser(authContext.user));
    }

    renderAfterCalled.current = true;
    // eslint-disable-next-line
  }, []);

  return (
    <DBContext.Provider
      value={{
        data: ctxData as ContextData,
        refreshData: refreshData,
        setData: updateContextData,
        removeData: removeContextData,
        restoreData: restoreContextData,
        removePermanentData: removePermanentCtxData,
        removePermanentDataList: removePermanentCtxDataList,
        uploadDataBatch: updateContextBatched,
        updateLatest: updateLatestContext,
      }}
    >
      {ctxData && ctxData.currentUser && children}
      {ctxData && !ctxData.currentUser && <UnauthorizedComponent />}
      {!ctxData && <PageLoading />}
    </DBContext.Provider>
  );
};
