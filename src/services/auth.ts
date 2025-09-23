import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { firebaseAuth } from '../config.ts';

export interface LoginFormValues {
    email: string;
    password: string;
}

export interface UserFormValues {
    email: string;
    password: string;
    displayName: string;
}

//IAuth context
export interface IAuth {
    user?: User | null; //type User comes from firebase
    loading: boolean;
    SignIn: (credentials: LoginFormValues) => void;
    SignUp: (credentials: UserFormValues) => void;
    SignOut: () => void;
    error: string | null;
}

// Persistence is configured centrally in firebase/config.ts using initializeAuth

export const SignIn = async ({ email, password }: LoginFormValues) => {
    return firebaseAuth
        ? await signInWithEmailAndPassword(firebaseAuth, email, password)
        : { user: null };
};

export const SignUp = async ({ email, password }: UserFormValues) => {
    return firebaseAuth
        ? await createUserWithEmailAndPassword(firebaseAuth, email, password)
        : { user: null };
};

export const SignOut = async () => {
    if (firebaseAuth) {
        await signOut(firebaseAuth);
    }
};
