import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { checkJiraConnection } from '../services/jira.ts';
import { AuthContext } from './AuthContext.tsx';
import {baseUrl} from "../utils/commons.ts";

type JiraStatus = number | null; // 200 OK, 401 unauth, 0 error, null unknown
type Ctx = {
  status: JiraStatus;
  message: string;
  loading: boolean;
  authUrl: string;
  refresh: () => Promise<()=>void>;
};

const JiraAuthContext = createContext<Ctx | null>(null);

export function JiraAuthProvider({
                                   children,
                                 }: {
  children: React.ReactNode;
}) {
  const { user } = useContext(AuthContext);

  const [status, setStatus] = useState<JiraStatus>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const authUrl = useMemo(() => {
    const redirect = encodeURIComponent(window.location.href);
    return baseUrl(`auth.php?action=start&redirect=${redirect}`);
  }, []);

  const refresh = async () => {
    if (!user) {
      setStatus(null);
      setMessage('');
      return () => {};
    }
    setLoading(true);
    let cancelled = false;

    try {
      const res = await checkJiraConnection(); // your existing function
      if (cancelled) return () => {};
      setStatus(res.status);
      const msg =
        res.json?.message ||
        (res.status === 401 ? 'Authenticate with JIRA to enable issue creation.' : '');
      setMessage(msg);
    } catch (e) {
      if (!cancelled) {
        setStatus(0);
        setMessage((e as Error)?.message || 'Network error');
      }
    } finally {
      if (!cancelled) setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  };

  // run on mount & whenever user changes
  useEffect(() => {
    if (user?.uid) {
      void refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]); // depend on stable user identifier

  const value = useMemo(
    () => ({ status, message, loading, authUrl, refresh }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, message, loading, authUrl]
  );

  return <JiraAuthContext.Provider value={value}>{children}</JiraAuthContext.Provider>;
}

export function useJiraAuth() {
  const ctx = useContext(JiraAuthContext);
  if (!ctx) throw new Error('useJiraAuth must be used within <JiraAuthProvider>');
  return ctx;
}
