const STORAGE_KEYS = {
  WORKOUTS: 'workoutlog_workouts',
  TEMPLATES: 'workoutlog_templates',
};

export const saveWorkout = (workout) => {
  try {
    const workouts = getWorkouts();
    const newWorkout = {
      id: Date.now(),
      date: new Date().toISOString().split('T')[0],
      name: workout.name || `Workout ${new Date().toLocaleDateString('pl-PL')}`,
      exercises: workout.exercises.length,
      exercisesList: workout.exercises,
      notes: workout.notes || '',
      createdAt: new Date().toISOString(),
    };
    workouts.unshift(newWorkout); 
    localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
    return newWorkout;
  } catch (error) {
    console.error('Error saving workout:', error);
    return null;
  }
};

export const getWorkouts = () => {
  try {
    const workouts = localStorage.getItem(STORAGE_KEYS.WORKOUTS);
    return workouts ? JSON.parse(workouts) : [];
  } catch (error) {
    console.error('Error getting workouts:', error);
    return [];
  }
};

export const updateWorkout = (workoutId, updatedWorkout) => {
  try {
    const workouts = getWorkouts();
    const index = workouts.findIndex(w => w.id === workoutId);
    if (index !== -1) {
      workouts[index] = { ...workouts[index], ...updatedWorkout };
      localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(workouts));
      return workouts[index];
    }
    return null;
  } catch (error) {
    console.error('Error updating workout:', error);
    return null;
  }
};

export const deleteWorkout = (workoutId) => {
  try {
    const workouts = getWorkouts();
    const filtered = workouts.filter(w => w.id !== workoutId);
    localStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting workout:', error);
    return false;
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
    
    const existingIndex = templates.findIndex(t => t.id === newTemplate.id);
    if (existingIndex !== -1) {

      templates[existingIndex] = newTemplate;
    } else {
      templates.push(newTemplate);
    }
    
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(templates));
    return newTemplate;
  } catch (error) {
    console.error('Error saving template:', error);
    return null;
  }
};

export const getTemplates = () => {
  try {
    const templates = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
    return templates ? JSON.parse(templates) : [];
  } catch (error) {
    console.error('Error getting templates:', error);
    return [];
  }
};

export const deleteTemplate = (templateId) => {
  try {
    const templates = getTemplates();
    const filtered = templates.filter(t => t.id !== templateId);
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting template:', error);
    return false;
  }
};
