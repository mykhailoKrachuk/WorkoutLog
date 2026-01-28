import { api } from "./api";

const STORAGE_KEYS = {
  TEMPLATES: "workoutlog_templates",
};

// helpers
const todayISO = () => new Date().toISOString().split("T")[0];

// Превращаем список set-ов (из /workouts/{id}) в формат exercisesList,
// который уже ждут твои компоненты (WorkoutDetails/Records).
function groupSetsToExercises(sets) {
  const map = new Map();

  for (const s of sets || []) {
    const key = s.exercise_id;
    if (!map.has(key)) {
      map.set(key, {
        id: key,
        exercise: s.exercise_name,
        muscleGroup: s.muscle_group,
        series: [],
      });
    }
    map.get(key).series.push({
      setNumber: s.set_number ?? null,
      weight: s.weight,
      reps: s.reps,
    });
  }

  return [...map.values()].map((ex) => {
    const maxWeight = Math.max(...ex.series.map((x) => x.weight));
    const maxReps = Math.max(...ex.series.map((x) => x.reps));
    return {
      ...ex,
      weight: Number.isFinite(maxWeight) ? maxWeight : 0,
      reps: Number.isFinite(maxReps) ? maxReps : 0,
      sets: ex.series.length,
      notes: "",
      isCustom: false,
    };
  });
}

// Ищем exercise по имени. Если нет, создаём через POST /exercises. :contentReference[oaicite:9]{index=9}
async function ensureExerciseIdByName(name, muscleGroup) {
  const list = await api.get("/exercises");
  const found = list.find((e) => e.name === name);
  if (found) return found.id;

  try {
    const created = await api.post("/exercises", {
      name,
      muscle_group: muscleGroup || "Other",
      note: null,
    });
    return created.id;
  } catch (e) {
    // если вдруг дубль, просто перезагрузим список
    const list2 = await api.get("/exercises");
    const found2 = list2.find((x) => x.name === name);
    if (found2) return found2.id;
    throw e;
  }
}

/* =======================
   WORKOUTS (через API)
   ======================= */

// Список тренировок (без сетов)
export const getWorkouts = async () => {
  const rows = await api.get("/workouts");
  return rows.map((w) => ({
    id: w.id,
    date: w.date,
    name: w.type,        // в бэке это поле type :contentReference[oaicite:10]{index=10}
    notes: w.note || "",
    exercises: 0,        // посчитаем после загрузки деталей
    exercisesList: null, // подгрузим отдельно
  }));
};

// Детали одной тренировки (с сетами)
export const getWorkoutDetails = async (workoutId) => {
  const w = await api.get(`/workouts/${workoutId}`);
  const exercisesList = groupSetsToExercises(w.sets);

  return {
    id: w.id,
    date: w.date,
    name: w.type,
    notes: w.note || "",
    exercises: exercisesList.length,
    exercisesList,
  };
};

// Создать тренировку + все её сеты
export const saveWorkout = async (workout) => {
  const date = workout.date || todayISO();
  const name = (workout.name || `Workout ${date}`).trim();
  const notes = (workout.notes || "").trim();

  // 1) создаём тренировку
  const created = await api.post("/workouts", {
    date,
    type: name,
    note: notes || null,
  });

  // 2) создаём сеты
  let setNumber = 1;

  for (const ex of workout.exercises || []) {
    const exName = ex.exercise || ex.name;
    const exGroup = ex.muscleGroup || ex.muscle_group || "Other";

    const exerciseId = await ensureExerciseIdByName(exName, exGroup);

    const series =
      ex.series && ex.series.length > 0
        ? ex.series
        : Array.from({ length: Number(ex.sets || 1) }, (_, i) => ({
            setNumber: i + 1,
            weight: Number(ex.weight || 0),
            reps: Number(ex.reps || 1),
          }));

    for (const s of series) {
      await api.post("/sets", {
        workout_id: created.id,
        exercise_id: exerciseId,
        weight: Number(s.weight || 0),
        reps: Number(s.reps || 1),
        set_number: setNumber++,
      });
    }
  }

  return created; // { id }
};

// Обновить только meta тренировки (name/notes/date)
// Важно: бэк сейчас не умеет обновлять/удалять отдельные set-ы. :contentReference[oaicite:11]{index=11}
export const updateWorkout = async (workoutId, updatedWorkout) => {
  await api.patch(`/workouts/${workoutId}`, {
    date: updatedWorkout.date ?? undefined,
    type: updatedWorkout.name ?? undefined,
    note: updatedWorkout.notes ?? undefined,
  });
  return true;
};

export const deleteWorkout = async (workoutId) => {
  await api.del(`/workouts/${workoutId}`);
  return true;
};

/* =======================
   TEMPLATES (localStorage)
   ======================= */

export const getTemplates = () => {
  try {
    const templates = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    return templates ? JSON.parse(templates) : [];
  } catch (error) {
    console.error("Error getting templates:", error);
    return [];
  }
};

export const saveTemplate = (template) => {
  try {
    const templates = getTemplates();
    const newTemplate = {
      id: template.id || Date.now(),
      name: template.name,
      exercises: template.exercises || [],
      createdAt: template.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const existingIndex = templates.findIndex((t) => t.id === newTemplate.id);
    if (existingIndex !== -1) templates[existingIndex] = newTemplate;
    else templates.unshift(newTemplate);

    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
    return newTemplate;
  } catch (error) {
    console.error("Error saving template:", error);
    return null;
  }
};

export const deleteTemplate = (templateId) => {
  try {
    const templates = getTemplates();
    const filtered = templates.filter((t) => t.id !== templateId);
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error("Error deleting template:", error);
    return false;
  }
};
