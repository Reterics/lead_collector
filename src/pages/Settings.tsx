import React, { useContext, useEffect, useState } from 'react';
import { DBContext } from '../context/DBContext.ts';
import type { CommonCollectionData } from '../services/firebase.tsx';
import { firebaseCollections, firebaseModel } from '../config.ts';
import { Link } from 'react-router-dom';
import type {JiraConfig} from "../services/jira.ts";

const Settings: React.FC = () => {
  const db = useContext(DBContext);
  const currentUser = db?.data?.currentUser;

  const [projectKey, setProjectKey] = useState('');
  const [issueType, setIssueType] = useState('Task');
  const [cloudId, setCloudId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="max-w-xl">
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
  );
};

export default Settings;
