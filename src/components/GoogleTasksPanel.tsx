import React, { useCallback, useEffect, useState } from 'react';
import {
  CheckSquare,
  Edit3,
  ListTodo,
  Loader2,
  Plus,
  RefreshCw,
  Square,
  Trash2,
} from 'lucide-react';
import type { CityGuide, ItineraryPlan } from '../data/japanData';
import {
  buildItineraryTaskDrafts,
  createGoogleTask,
  deleteGoogleTask,
  fetchTaskLists,
  fetchTasksInList,
  updateGoogleTask,
  WorkspaceAuthError,
  type GoogleTaskItem,
  type GoogleTaskList,
} from '../utils/googleTasks';
import { GoogleSignInButton } from './GoogleSignInButton';

interface GoogleTasksPanelProps {
  workspaceToken: string | null;
  onConnectGoogle: () => Promise<void>;
  onTokenExpired: () => void;
  selectedCity: CityGuide;
  itinerary: ItineraryPlan;
}

type PendingMutation =
  | {
      type: 'toggle';
      task: GoogleTaskItem;
      nextStatus: 'needsAction' | 'completed';
    }
  | {
      type: 'edit';
      task: GoogleTaskItem;
      nextTitle: string;
      nextNotes: string;
    }
  | {
      type: 'delete';
      task: GoogleTaskItem;
    };

export const GoogleTasksPanel: React.FC<GoogleTasksPanelProps> = ({
  workspaceToken,
  onConnectGoogle,
  onTokenExpired,
  selectedCity,
  itinerary,
}) => {
  const [connecting, setConnecting] = useState(false);
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [tasks, setTasks] = useState<GoogleTaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Create form
  const [newTitle, setNewTitle] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newDue, setNewDue] = useState('');

  // Inline edit draft before confirmation modal
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Mandatory explicit confirmation dialog for mutating / destructive operations
  const [pendingMutation, setPendingMutation] = useState<PendingMutation | null>(null);

  const handleAuthError = useCallback(
    (err: unknown): boolean => {
      if (err instanceof WorkspaceAuthError) {
        onTokenExpired();
        setError('Your Google Tasks session expired. Please sign in with Google to reconnect.');
        return true;
      }
      return false;
    },
    [onTokenExpired]
  );

  const loadTaskListsAndTasks = useCallback(async () => {
    if (!workspaceToken) return;
    setLoading(true);
    setError(null);
    try {
      const lists = await fetchTaskLists(workspaceToken);
      setTaskLists(lists);
      const targetListId =
        lists.find((l) => l.id === selectedListId)?.id || lists[0]?.id || '';
      setSelectedListId(targetListId);
      if (targetListId) {
        const items = await fetchTasksInList(workspaceToken, targetListId);
        setTasks(items);
      } else {
        setTasks([]);
      }
    } catch (err: unknown) {
      if (!handleAuthError(err)) {
        setError(err instanceof Error ? err.message : 'Unable to load Google Tasks.');
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceToken, selectedListId, handleAuthError]);

  useEffect(() => {
    if (workspaceToken) {
      loadTaskListsAndTasks();
    } else {
      setTaskLists([]);
      setTasks([]);
      setSelectedListId('');
    }
  }, [workspaceToken]);

  const handleSelectList = async (listId: string) => {
    setSelectedListId(listId);
    if (!workspaceToken || !listId) return;
    setLoading(true);
    setError(null);
    try {
      const items = await fetchTasksInList(workspaceToken, listId);
      setTasks(items);
    } catch (err: unknown) {
      if (!handleAuthError(err)) {
        setError(err instanceof Error ? err.message : 'Unable to load tasks in selected list.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      await onConnectGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Google sign-in was cancelled.');
    } finally {
      setConnecting(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceToken || !selectedListId || !newTitle.trim()) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const created = await createGoogleTask(workspaceToken, selectedListId, {
        title: newTitle,
        notes: newNotes,
        dueDate: newDue,
      });
      setTasks((prev) => [created, ...prev]);
      setNewTitle('');
      setNewNotes('');
      setNewDue('');
      setNotice(`Added "${created.title}" to Google Tasks.`);
    } catch (err: unknown) {
      if (!handleAuthError(err)) {
        setError(err instanceof Error ? err.message : 'Could not create task.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportItineraryStops = async () => {
    if (!workspaceToken || !selectedListId) return;
    const drafts = buildItineraryTaskDrafts(
      selectedCity,
      itinerary,
      tasks.map((t) => t.title)
    );
    if (drafts.length === 0) {
      setNotice('All stops from your current itinerary and city checklist are already in this list.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const createdItems: GoogleTaskItem[] = [];
      for (const draft of drafts.slice(0, 6)) {
        const created = await createGoogleTask(workspaceToken, selectedListId, {
          title: draft.title,
          notes: draft.notes,
        });
        createdItems.push(created);
      }
      setTasks((prev) => [...createdItems, ...prev]);
      setNotice(`Synced ${createdItems.length} trip stops to Google Tasks.`);
    } catch (err: unknown) {
      if (!handleAuthError(err)) {
        setError(err instanceof Error ? err.message : 'Could not sync itinerary tasks.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const executeConfirmedMutation = async () => {
    if (!pendingMutation || !workspaceToken || !selectedListId) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);

    try {
      if (pendingMutation.type === 'toggle') {
        const updated = await updateGoogleTask(
          workspaceToken,
          selectedListId,
          pendingMutation.task.id,
          { status: pendingMutation.nextStatus }
        );
        setTasks((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t))
        );
        setNotice(
          updated.status === 'completed'
            ? `Marked "${updated.title}" completed.`
            : `Reopened "${updated.title}".`
        );
      } else if (pendingMutation.type === 'edit') {
        const updated = await updateGoogleTask(
          workspaceToken,
          selectedListId,
          pendingMutation.task.id,
          {
            title: pendingMutation.nextTitle.trim(),
            notes: pendingMutation.nextNotes.trim(),
          }
        );
        setTasks((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t))
        );
        setEditingTaskId(null);
        setNotice(`Updated "${updated.title}".`);
      } else if (pendingMutation.type === 'delete') {
        await deleteGoogleTask(
          workspaceToken,
          selectedListId,
          pendingMutation.task.id
        );
        setTasks((prev) => prev.filter((t) => t.id !== pendingMutation.task.id));
        setNotice(`Deleted "${pendingMutation.task.title}".`);
      }
    } catch (err: unknown) {
      if (!handleAuthError(err)) {
        setError(err instanceof Error ? err.message : 'Google Tasks update failed.');
      }
    } finally {
      setSubmitting(false);
      setPendingMutation(null);
    }
  };

  return (
    <section className="liquid-glass rounded-2xl p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-token flex items-center justify-center shrink-0">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-primary-token">
              Google Tasks · Trip Preparation Checklist
            </h2>
            <p className="text-xs text-muted-token">
              Sync Japan transit tickets, temple reservations, and {selectedCity.id} etiquette tasks.
            </p>
          </div>
        </div>

        {workspaceToken && (
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="gtasks-list-select" className="sr-only">
              Select Google Task List
            </label>
            <select
              id="gtasks-list-select"
              value={selectedListId}
              onChange={(e) => handleSelectList(e.target.value)}
              className="rounded-xl px-3 py-2 text-xs font-medium liquid-glass text-primary-token"
            >
              {taskLists.map((list) => (
                <option key={list.id} value={list.id}>
                  {list.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadTaskListsAndTasks}
              disabled={loading}
              aria-label="Refresh Google Tasks"
              className="p-2 rounded-xl liquid-glass text-secondary-token hover:text-primary-token"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={handleImportItineraryStops}
              disabled={submitting || !selectedListId}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-accent-token disabled:opacity-60 whitespace-nowrap"
            >
              Sync Itinerary to Tasks
            </button>
          </div>
        )}
      </div>

      {!workspaceToken ? (
        <div className="rounded-2xl p-6 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="font-semibold text-sm text-primary-token">
              Connect Your Google Tasks Account
            </p>
            <p className="text-xs text-secondary-token max-w-xl leading-relaxed">
              Sign in with Google to view your personal task lists, export stops from your generated Japan itinerary, and track reservations with explicit confirmation before modifying or deleting tasks.
            </p>
            {error && <p className="text-xs text-rose-400 pt-1">{error}</p>}
          </div>
          <GoogleSignInButton
            onClick={handleConnect}
            disabled={connecting}
            label={connecting ? 'Connecting…' : 'Sign in with Google'}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Add New Trip Task Form */}
          <form
            onSubmit={handleCreateTask}
            className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end"
          >
            <div className="md:col-span-5">
              <label htmlFor="gtask-title" className="block text-xs text-muted-token mb-1">
                New Task Title
              </label>
              <input
                id="gtask-title"
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={`e.g. Reserve ${selectedCity.id} museum pass`}
                className="w-full rounded-xl px-3 py-2 text-xs sm:text-sm liquid-glass text-primary-token placeholder:text-muted-token"
              />
            </div>
            <div className="md:col-span-4">
              <label htmlFor="gtask-notes" className="block text-xs text-muted-token mb-1">
                Notes (Optional)
              </label>
              <input
                id="gtask-notes"
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Confirmation code or station gate"
                className="w-full rounded-xl px-3 py-2 text-xs sm:text-sm liquid-glass text-primary-token placeholder:text-muted-token"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="gtask-due" className="block text-xs text-muted-token mb-1">
                Due Date
              </label>
              <input
                id="gtask-due"
                type="date"
                value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
                className="w-full rounded-xl px-3 py-2 text-xs liquid-glass text-primary-token"
              />
            </div>
            <div className="md:col-span-1">
              <button
                type="submit"
                disabled={submitting || !newTitle.trim()}
                aria-label="Add task to Google Tasks"
                className="w-full inline-flex items-center justify-center gap-1 py-2 px-3 rounded-xl text-xs font-semibold bg-accent-token disabled:opacity-60"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </form>

          {error && <p className="text-xs text-rose-400">{error}</p>}
          {notice && <p className="text-xs text-emerald-400">{notice}</p>}

          {/* Tasks List */}
          {loading ? (
            <div className="py-8 flex items-center justify-center gap-2 text-xs text-muted-token">
              <Loader2 className="w-4 h-4 animate-spin text-accent-token" />
              <span>Loading Google Tasks…</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="rounded-xl p-6 bg-black/5 dark:bg-black/30 text-center text-xs text-muted-token">
              No tasks in this Google Task List yet. Add one above or click “Sync Itinerary to Tasks”.
            </div>
          ) : (
            <ul className="space-y-2">
              {tasks.map((task) => {
                const isCompleted = task.status === 'completed';
                const isEditing = editingTaskId === task.id;
                return (
                  <li
                    key={task.id}
                    className="rounded-xl p-3.5 bg-black/5 dark:bg-black/35 border border-black/10 dark:border-amber-200/15"
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          aria-label="Edit task title"
                          className="w-full rounded-lg px-3 py-1.5 text-xs sm:text-sm liquid-glass text-primary-token"
                        />
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          aria-label="Edit task notes"
                          placeholder="Notes…"
                          className="w-full rounded-lg px-3 py-1.5 text-xs liquid-glass text-secondary-token"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingTaskId(null)}
                            className="px-3 py-1.5 rounded-lg text-xs liquid-glass text-secondary-token"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setPendingMutation({
                                type: 'edit',
                                task,
                                nextTitle: editTitle,
                                nextNotes: editNotes,
                              })
                            }
                            disabled={!editTitle.trim()}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-accent-token disabled:opacity-50"
                          >
                            Review &amp; Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <button
                            type="button"
                            onClick={() =>
                              setPendingMutation({
                                type: 'toggle',
                                task,
                                nextStatus: isCompleted ? 'needsAction' : 'completed',
                              })
                            }
                            aria-label={
                              isCompleted
                                ? `Reopen task ${task.title}`
                                : `Mark task ${task.title} completed`
                            }
                            className="mt-0.5 text-accent-token shrink-0"
                          >
                            {isCompleted ? (
                              <CheckSquare className="w-4 h-4" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <p
                              className={`text-sm font-medium ${
                                isCompleted
                                  ? 'line-through text-muted-token'
                                  : 'text-primary-token'
                              }`}
                            >
                              {task.title}
                            </p>
                            {task.notes && (
                              <p className="text-xs text-secondary-token mt-0.5 break-words">
                                {task.notes}
                              </p>
                            )}
                            {task.due && (
                              <p className="text-[11px] font-mono text-muted-token mt-1">
                                Due: {task.due.slice(0, 10)}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTaskId(task.id);
                              setEditTitle(task.title);
                              setEditNotes(task.notes || '');
                            }}
                            aria-label={`Edit task ${task.title}`}
                            className="p-1.5 rounded-lg liquid-glass text-secondary-token hover:text-primary-token"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingMutation({ type: 'delete', task })}
                            aria-label={`Delete task ${task.title}`}
                            className="p-1.5 rounded-lg liquid-glass text-rose-400 hover:text-rose-300"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Mandatory User Confirmation Dialog for Updates & Deletes */}
      {pendingMutation && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gtask-confirm-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <div className="liquid-glass-elevated rounded-2xl max-w-md w-full p-6 space-y-4 border border-amber-300/30 shadow-2xl">
            <h3
              id="gtask-confirm-title"
              className="font-display text-lg font-semibold text-primary-token"
            >
              {pendingMutation.type === 'delete'
                ? 'Confirm Task Deletion'
                : 'Confirm Google Tasks Update'}
            </h3>
            <p className="text-xs sm:text-sm text-secondary-token leading-relaxed">
              {pendingMutation.type === 'delete' &&
                `Are you sure you want to permanently delete "${pendingMutation.task.title}" from your Google Tasks list? This action cannot be undone.`}
              {pendingMutation.type === 'toggle' &&
                (pendingMutation.nextStatus === 'completed'
                  ? `Mark "${pendingMutation.task.title}" as completed in your Google Tasks account?`
                  : `Reopen "${pendingMutation.task.title}" and set its status back to active in Google Tasks?`)}
              {pendingMutation.type === 'edit' &&
                `Update "${pendingMutation.task.title}" in Google Tasks with title "${pendingMutation.nextTitle}"?`}
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setPendingMutation(null)}
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-medium liquid-glass text-secondary-token hover:text-primary-token"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeConfirmedMutation}
                disabled={submitting}
                className={`px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-60 ${
                  pendingMutation.type === 'delete'
                    ? 'bg-rose-600 text-white hover:bg-rose-500'
                    : 'bg-accent-token'
                }`}
              >
                {submitting
                  ? 'Saving…'
                  : pendingMutation.type === 'delete'
                    ? 'Delete Task'
                    : 'Confirm Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
