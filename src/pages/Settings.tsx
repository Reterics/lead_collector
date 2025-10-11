import React, { useContext, useEffect, useMemo, useState } from 'react';
import { DBContext } from '../context/DBContext.ts';
import type { CommonCollectionData } from '../services/firebase.tsx';
import { firebaseCollections, firebaseModel } from '../config.ts';
import type { JiraConfig } from '../services/jira.ts';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ThemeToggleButton from '../components/ThemeToggleButton';

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const db = useContext(DBContext);
  const currentUser = db?.data?.currentUser;
  const isAdmin = useMemo(() => currentUser?.role === 'admin', [currentUser?.role]);

  const [projectKey, setProjectKey] = useState('');
  const [issueType, setIssueType] = useState('Task');
  const [cloudId, setCloudId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Tab state: 'general' and 'user' always available; 'list' and 'add' shown for admins
  const [activeTab, setActiveTab] = useState<'general' | 'user' | 'list' | 'add'>('user');

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

      setSaved(t('settings.saved'));
    } catch (err) {
      setError((err as Error)?.message || t('settings.saveFailed'));
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
        throw new Error(t('settings.addUser.validation.validEmailRequired'));
      }
      if (newPassword && newPassword !== newPassword2) {
        throw new Error(t('settings.addUser.validation.passwordsDoNotMatch'));
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

      setCreateMsg(t('settings.addUser.created'));
      // Reset form (do not keep passwords in memory)
      setNewEmail('');
      setNewName('');
      setNewRole('user');
      setNewPassword('');
      setNewPassword2('');
    } catch (err) {
      setCreateErr((err as Error)?.message || t('settings.addUser.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-3xl">

      {/* Tabs header */}
      <div role="tablist" aria-label="Settings tabs" className="flex gap-1 mb-4 overflow-x-auto overflow-y-hidden p-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/90 backdrop-blur supports-[backdrop-filter]:bg-white/70">
        <button
          role="tab"
          aria-selected={activeTab === 'general'}
          onClick={() => setActiveTab('general')}
          className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors ${activeTab === 'general' ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'}`}
        >
          {t('settings.tabs.general')}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'user'}
          onClick={() => setActiveTab('user')}
          className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors ${activeTab === 'user' ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'}`}
        >
          {t('settings.tabs.user') }
        </button>
        {isAdmin && (
          <>
            <button
              role="tab"
              aria-selected={activeTab === 'list'}
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors ${activeTab === 'list' ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              {t('settings.tabs.list') }
            </button>
            <button
              role="tab"
              aria-selected={activeTab === 'add'}
              onClick={() => setActiveTab('add')}
              className={`px-3 py-1.5 text-xs sm:text-sm rounded-md transition-colors ${activeTab === 'add' ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              {t('settings.tabs.add') }
            </button>
          </>
        )}
      </div>

      {/* Tab panels */}
      {activeTab === 'general' && (
        <div role="tabpanel" className="space-y-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <h4 className="text-md font-medium text-gray-900 dark:text-white">{t('settings.general.language.title')}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.general.language.desc')}</p>
            </div>
            <div className="flex sm:justify-end">
              <LanguageSwitcher />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <h4 className="text-md font-medium text-gray-900 dark:text-white">{t('settings.general.theme.title')}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('settings.general.theme.desc')}</p>
            </div>
            <div className="flex sm:justify-end">
              <ThemeToggleButton />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'user' && (
        <div role="tabpanel" className="space-y-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.form.jiraProjectKey')}</label>
            <input value={projectKey} onChange={e=>setProjectKey(e.target.value)} placeholder={t('settings.form.placeholders.projectKey')} className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.form.jiraIssueType')}</label>
            <input value={issueType} onChange={e=>setIssueType(e.target.value)} placeholder={t('settings.form.placeholders.issueType')} className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.form.jiraCloudId')}</label>
            <input value={cloudId} onChange={e=>setCloudId(e.target.value)} placeholder={t('settings.form.placeholders.cloudId')} className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
            <p className="text-xs text-gray-500 mt-1">{t('settings.form.cloudIdHelp')}</p>
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          {saved && <div className="text-sm text-emerald-600">{saved}</div>}
          <div className="flex justify-end">
            <button onClick={onSave as unknown as React.MouseEventHandler<HTMLButtonElement>} type="button" disabled={saving} className={`px-4 py-2 rounded-md text-white ${saving? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>{saving ? t('settings.saving') : t('settings.save')}</button>
          </div>
        </div>
      )}

      {isAdmin && activeTab === 'add' && (
        <div role="tabpanel" className="space-y-3 bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.addUser.email')}</label>
              <input type="email" value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder={t('settings.form.placeholders.email')} className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.addUser.name')}</label>
              <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder={t('settings.form.placeholders.name')} className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.addUser.role')}</label>
              <select value={newRole} onChange={(e: React.ChangeEvent<HTMLSelectElement>)=>setNewRole(e.target.value as 'admin' | 'manager' | 'user')} className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                <option value="user">User</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.addUser.tempPassword')}</label>
              <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder={t('settings.form.placeholders.tempPassword')} className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('settings.addUser.confirmPassword')}</label>
              <input type="password" value={newPassword2} onChange={e=>setNewPassword2(e.target.value)} placeholder={t('settings.form.placeholders.confirmPassword')} className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
            </div>
          </div>

          {createErr && <div className="text-sm text-red-600">{createErr}</div>}
          {createMsg && <div className="text-sm text-emerald-600">{createMsg}</div>}

          <div className="flex justify-end">
            <button onClick={onCreateUser as unknown as React.MouseEventHandler<HTMLButtonElement>} type="button" disabled={creating} className={`px-4 py-2 rounded-md text-white ${creating? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}>{creating? t('settings.addUser.creating') : t('settings.addUser.create')}</button>
          </div>
        </div>
      )}

      {isAdmin && activeTab === 'list' && !!db?.data?.users?.length && (
        <div role="tabpanel" className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h4 className="text-md font-medium text-gray-900 dark:text-white mb-2">{t('settings.list.title')}</h4>
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
  );
};

export default Settings;
