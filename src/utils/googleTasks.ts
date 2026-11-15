import type { CityGuide, ItineraryPlan } from '../data/japanData';

export interface GoogleTaskList {
  id: string;
  title: string;
  updated?: string;
}

export interface GoogleTaskItem {
  id: string;
  title: string;
  notes?: string;
  status: 'needsAction' | 'completed';
  due?: string;
  completed?: string;
  updated?: string;
}

export class WorkspaceAuthError extends Error {
  constructor(message = 'Google Tasks authorization expired. Please sign in with Google again.') {
    super(message);
    this.name = 'WorkspaceAuthError';
  }
}

const TASKS_API_BASE = 'https://tasks.googleapis.com/tasks/v1';

async function tasksFetch<T>(
  url: string,
  accessToken: string,
  init: RequestInit = {}
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  if (res.status === 401 || res.status === 403) {
    throw new WorkspaceAuthError();
  }

  if (!res.ok) {
    let errText = `Google Tasks request failed (${res.status})`;
    try {
      const payload = (await res.json()) as { error?: { message?: string } };
      if (payload?.error?.message) errText = payload.error.message;
    } catch {
      // Ignore JSON parse failures on empty error bodies
    }
    throw new Error(errText);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

export async function fetchTaskLists(accessToken: string): Promise<GoogleTaskList[]> {
  const data = await tasksFetch<{ items?: GoogleTaskList[] }>(
    `${TASKS_API_BASE}/users/@me/lists`,
    accessToken
  );
  return data.items ?? [];
}

export async function fetchTasksInList(
  accessToken: string,
  taskListId: string
): Promise<GoogleTaskItem[]> {
  const data = await tasksFetch<{ items?: GoogleTaskItem[] }>(
    `${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks?showCompleted=true&showHidden=false&maxResults=50`,
    accessToken
  );
  return (data.items ?? []).filter((t) => Boolean(t.title && t.title.trim().length > 0));
}

export async function createGoogleTask(
  accessToken: string,
  taskListId: string,
  input: { title: string; notes?: string; dueDate?: string }
): Promise<GoogleTaskItem> {
  const body: Record<string, string> = {
    title: input.title.trim().slice(0, 200),
  };
  if (input.notes && input.notes.trim()) {
    body.notes = input.notes.trim().slice(0, 1000);
  }
  if (input.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) {
    body.due = `${input.dueDate}T00:00:00.000Z`;
  }

  return tasksFetch<GoogleTaskItem>(
    `${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks`,
    accessToken,
    {
      method: 'POST',
      body: JSON.stringify(body),
    }
  );
}

export async function updateGoogleTask(
  accessToken: string,
  taskListId: string,
  taskId: string,
  patch: { title?: string; notes?: string; status?: 'needsAction' | 'completed' }
): Promise<GoogleTaskItem> {
  return tasksFetch<GoogleTaskItem>(
    `${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
    accessToken,
    {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }
  );
}

export async function deleteGoogleTask(
  accessToken: string,
  taskListId: string,
  taskId: string
): Promise<void> {
  await tasksFetch<void>(
    `${TASKS_API_BASE}/lists/${encodeURIComponent(taskListId)}/tasks/${encodeURIComponent(taskId)}`,
    accessToken,
    { method: 'DELETE' }
  );
}

export interface TaskDraft {
  title: string;
  notes: string;
}

export function buildItineraryTaskDrafts(
  city: CityGuide,
  itinerary: ItineraryPlan,
  existingTitles: string[] = []
): TaskDraft[] {
  const seen = new Set(existingTitles.map((t) => t.trim().toLowerCase()));
  const drafts: TaskDraft[] = [];

  for (const day of itinerary.days) {
    for (const stop of day.stops) {
      const title = `[Day ${day.dayNumber} · ${day.region}] ${stop.name}`;
      if (!seen.has(title.toLowerCase())) {
        seen.add(title.toLowerCase());
        drafts.push({
          title,
          notes: `${stop.time} (${stop.area}) — ${stop.transitNote} | Est. ¥${stop.estimatedJpy.toLocaleString('en-US')}`,
        });
      }
    }
  }

  const cityChecklistTitle = `${city.id} Etiquette Check: ${city.etiquetteOverlayTitle}`;
  if (!seen.has(cityChecklistTitle.toLowerCase())) {
    drafts.push({
      title: cityChecklistTitle,
      notes: city.etiquetteChecklist.join(' • '),
    });
  }

  return drafts;
}
