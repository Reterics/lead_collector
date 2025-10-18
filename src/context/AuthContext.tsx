import { firebaseAuth, firebaseAuthError, firebaseModel, firebaseCollections } from '../config.ts';
import React, { createContext, useEffect, useState } from 'react';
import type {
  IAuth,
  LoginFormValues,
  UserFormValues,
} from '../services/auth.ts';
import { useNavigate } from 'react-router-dom';
import { SignIn, SignOut, SignUp } from '../services/auth.ts';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import PageLoading from '../components/PageLoading.tsx';
import { FIREBASE_ERRORS } from './FirebaseErrors.ts';
import ScreenMessage from '../components/ScreenMessage.tsx';
import type {CommonCollectionData} from "../services/firebase.tsx";

export const AuthContext = createContext<IAuth>({
  user: firebaseAuth?.currentUser,
  loading: false,
  SignIn: () => {},
  SignUp: () => {},
  SignOut: () => {},
  error: null,
});

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const setTranslatedError = (code: string) => {
    setError(FIREBASE_ERRORS[code as keyof typeof FIREBASE_ERRORS] || code);
  };

  const SignUpMethod = (credentials: UserFormValues) => {
    setIsLoading(true);
    SignUp(credentials)
      .then(async (userCredential) => {
        const { user } = userCredential; //object destructuring
        if (user) {
          setCurrentUser(user);
          try {
            // Create user profile doc with default role if it doesn't exist
            const userEntry: CommonCollectionData = {
              id: user.uid,
              email: user.email || undefined,
              username: user.email || user.uid,
              teamId: credentials.teamId || (credentials.role === "admin" ? user.uid : ""),
            }
            if (credentials.role) {
              userEntry.role = credentials.role;
            }
            await firebaseModel.update(
              userEntry,
              firebaseCollections.users,
            );
          } catch (e) {
            console.warn('Failed to create user profile doc:', e);
          }
          //redirect the user on the targeted route
          // navigate('/', { replace: true });
        } else {
          setTranslatedError('auth/user-not-found');
        }
        setIsLoading(false);
      })
      .catch((error) => {
        setTranslatedError(error.code);
        // you can check for more error like email not valid or something
        setIsLoading(false);
      });
  };

  const SignInMethod = async (creds: LoginFormValues) => {
    setIsLoading(true);
    SignIn(creds)
      .then((userCredential) => {
        const { user } = userCredential;
        if (user) {
          setCurrentUser(user);
          //redirect user to targeted route
          navigate('/', { replace: true });
        } else {
          setTranslatedError('auth/user-not-found');
        }
        setIsLoading(false);
      })
      .catch((error) => {
        setTranslatedError(error.code);
        setIsLoading(false);
      });
  };

  const SignOutMethod = async () => {
    setIsLoading(true);
    try {
      await SignOut();
      setCurrentUser(null);
      setIsLoading(false);
      navigate('/signin', { replace: true });
    } catch (error) {
      setIsLoading(false);
      console.warn('Error happened during signing out, ', error);
      //show error alert
    }
  };
  //create Auth Values
  const authValues: IAuth = {
    user: currentUser,
    loading: isLoading,
    SignIn: SignInMethod,
    SignUp: SignUpMethod,
    SignOut: SignOutMethod,
    error: error,
  };

  useEffect(() => {
    //onAuthStateChanged check if the user is still logged in or not
    if (firebaseAuth) {
      return onAuthStateChanged(firebaseAuth, async (user) => {
        setCurrentUser(user);
        setIsAuthLoading(false);
        // Backfill user profile with role if missing
        try {
          if (user) {
            const existing = await firebaseModel.get(user.uid, firebaseCollections.users);
            if (!existing) {
              await firebaseModel.update(
                {
                  id: user.uid,
                  email: user.email || undefined,
                  username: user.email || user.uid,
                  role: 'user',
                  teamId: user.uid,
                },
                firebaseCollections.users,
              );
            }
          }
        } catch (e) {
          console.warn('Failed to backfill user profile doc:', e);
        }
      });
    }
    console.warn('AuthProvider failed to load due to missing firebaseAuth');
  }, []);

  if (firebaseAuthError)
    return (
      <ScreenMessage>
        <b>Error code: {firebaseAuthError.code}</b>
      </ScreenMessage>
    );

  //If loading for the first time when visiting the page
  if (isAuthLoading) return <PageLoading />;

  return (
    <AuthContext.Provider value={authValues}>{children}</AuthContext.Provider>
  );
};

export default AuthProvider;
