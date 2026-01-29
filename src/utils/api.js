const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000';

async function apiFetch(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (res.status === 204) return null;

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const body = isJson ? await res.json().catch(() => null) : await res.text().catch(() => '');

  if (!res.ok) {
    const msg =
      (body && typeof body === 'object' && (body.detail || body.message)) ||
      (typeof body === 'string' && body) ||
      `Request failed: ${res.status}`;
    throw new Error(msg);
  }

  return body;
}

export function listExercises({ muscleGroup } = {}) {
  const qs = muscleGroup ? `?muscle_group=${encodeURIComponent(muscleGroup)}` : '';
  return apiFetch(`/exercises${qs}`);
}

export function createExercise(payload) {
  return apiFetch('/exercises', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createWorkout(payload) {
  return apiFetch('/workouts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function createSet(payload) {
  return apiFetch('/sets', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteWorkout(workoutId) {
  return apiFetch(`/workouts/${workoutId}`, { method: 'DELETE' });
}

export function getWorkoutsHistory({ limit = 50, includeStats = true } = {}) {
  const qs = new URLSearchParams();
  if (limit) qs.set('limit', String(limit));
  qs.set('include_stats', includeStats ? 'true' : 'false');
  return apiFetch(`/workouts/history?${qs.toString()}`);
}

export function getWorkout(workoutId) {
  return apiFetch(`/workouts/${workoutId}`);
}

export function getRecords({ sortBy } = {}) {
  const qs = new URLSearchParams();
  if (sortBy) qs.set('sort_by', sortBy);
  return apiFetch(`/records${qs.toString() ? `?${qs.toString()}` : ''}`);
}

