import { createContext } from 'react';
import type { DBContextType } from '../services/firebase.tsx';

export const DBContext = createContext<DBContextType | null>(null);
