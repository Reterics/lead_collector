import React, { useContext, useEffect, useMemo, useState } from 'react';
import { DBContext } from '../context/DBContext.ts';
import type { CommonCollectionData } from '../services/firebase.tsx';
import { firebaseCollections, firebaseModel } from '../config.ts';
import { Link } from 'react-router-dom';
import type { JiraConfig } from '../services/jira.ts';

const Settings: React.FC = () => {
  const db = useContext(DBContext);
  const currentUser = db?.data?.currentUser;
  const isAdmin = useMemo(() => currentUser?.role === 'admin', [currentUser?.role]);

  const [projectKey, setProjectKey] = useState('');
  const [issueType, setIssueType] = useState('Task');
  const [cloudId, setCloudId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);


  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'manager' | 'user'>('user');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState<string | null>(null);
  const [createErr, setCreateErr] = useState<string | null>(null);

  useEffect(() => {
    const cu: JiraConfig = (currentUser || {}) as unknown as JiraConfig;
    setProjectKey(cu.projectKey || '');
    setIssueType(cu.issueType || 'Task');
    setCloudId(cu.cloudId || '');
  }, [currentUser, currentUser?.id]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(null);
    setError(null);
    try {
      // Persist to Firestore under users collection, merge with existing user doc
      if (!currentUser?.id) throw new Error('No current user');
      const update: CommonCollectionData = {
        id: currentUser.id,
        jiraProjectKey: projectKey || undefined,
        jiraIssueType: issueType || 'Task',
        jiraCloudId: cloudId || undefined,
      };
      await firebaseModel.update(update, firebaseCollections.users);

      setSaved('Saved');
    } catch (err) {
      setError((err as Error)?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const onCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    setCreating(true);
    setCreateMsg(null);
    setCreateErr(null);
    try {
      const email = newEmail.trim().toLowerCase();
      const username = newName.trim() || email;
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        throw new Error('Valid email is required');
      }
      if (newPassword && newPassword !== newPassword2) {
        throw new Error('Passwords do not match');
      }

      // Create user document; FirebaseDBModel will auto-generate ID if not provided
      const userDoc: Partial<CommonCollectionData> & { password?: string; password_confirmation?: string } = {
        email,
        username,
        role: newRole,
      };

      // Include temp password fields only if provided
      if (newPassword) {
        // Persist temporarily; provider sanitizes when listing
        userDoc.password = newPassword;
        userDoc.password_confirmation = newPassword2 || newPassword;
      }

      await firebaseModel.update(userDoc as CommonCollectionData, firebaseCollections.users);

      // Refresh context so admin can see the new user right away
      await db?.refreshData?.();

      setCreateMsg('User created');
      // Reset form (do not keep passwords in memory)
      setNewEmail('');
      setNewName('');
      setNewRole('user');
      setNewPassword('');
      setNewPassword2('');
    } catch (err) {
      setCreateErr((err as Error)?.message || 'User creation failed');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">User settings</h2>
          <Link to="/" className="text-blue-600 hover:underline">&larr; Back</Link>
        </div>
        <form onSubmit={onSave} className="space-y-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">JIRA Project Key</label>
            <input value={projectKey} onChange={e=>setProjectKey(e.target.value)} placeholder="e.g. ABC" className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">JIRA Issue Type</label>
            <input value={issueType} onChange={e=>setIssueType(e.target.value)} placeholder="Task" className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">JIRA Cloud ID</label>
            <input value={cloudId} onChange={e=>setCloudId(e.target.value)} placeholder="Optional, usually discovered via OAuth" className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
            <p className="text-xs text-gray-500 mt-1">If set, the backend may use this to target a specific Jira site.</p>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          {saved && <div className="text-sm text-emerald-600">{saved}</div>}
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className={`px-4 py-2 rounded-md text-white ${saving? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>{saving? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>

      {isAdmin && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Admin: Register new user</h3>
          <form onSubmit={onCreateUser} className="space-y-3 bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="user@example.com" className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Full name (optional)" className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                <select value={newRole} onChange={(e: React.ChangeEvent<HTMLSelectElement>)=>setNewRole(e.target.value as 'admin' | 'manager' | 'user')} className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                  <option value="user">User</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div />
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Temporary password</label>
                <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Optional" className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm password</label>
                <input type="password" value={newPassword2} onChange={e=>setNewPassword2(e.target.value)} placeholder="Repeat password" className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
              </div>
            </div>

            {createErr && <div className="text-sm text-red-600">{createErr}</div>}
            {createMsg && <div className="text-sm text-emerald-600">{createMsg}</div>}

            <div className="flex justify-end">
              <button type="submit" disabled={creating} className={`px-4 py-2 rounded-md text-white ${creating? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}>{creating? 'Creating...' : 'Create user'}</button>
            </div>
          </form>

          {!!db?.data?.users?.length && (
            <div className="mt-4">
              <h4 className="text-md font-medium text-gray-900 dark:text-white mb-1">Existing users</h4>
              <ul className="text-sm divide-y divide-gray-200 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                {db.data.users.map(u => (
                  <li key={u.id} className="px-3 py-2 flex items-center justify-between bg-white dark:bg-gray-800">
                    <span className="truncate">
                      <span className="font-medium">{u.username || u.email}</span>
                      <span className="text-gray-500"> &lt;{u.email}&gt;</span>
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">{u.role || 'user'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Settings;
