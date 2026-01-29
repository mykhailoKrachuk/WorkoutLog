from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, constr, Field
from typing import Optional
import sqlite3
from db import init_db, seed_exercises, get_conn

app = FastAPI(title="Workout App", description="API для отслеживания тренировок")

# Allow local React dev server (http://localhost:3000) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

NonEmptyStr = constr(strip_whitespace=True, min_length=1)


class WorkoutCreate(BaseModel):
    date: NonEmptyStr
    type: NonEmptyStr
    note: Optional[NonEmptyStr] = None


class ExerciseCreate(BaseModel):
    name: NonEmptyStr
    muscle_group: NonEmptyStr
    note: Optional[NonEmptyStr] = None


class ExerciseUpdate(BaseModel):
    name: Optional[NonEmptyStr] = None
    muscle_group: Optional[NonEmptyStr] = None
    note: Optional[NonEmptyStr] = None


class SetCreate(BaseModel):
    workout_id: int
    exercise_id: int
    weight: float = Field(ge=0)
    reps: int = Field(gt=0)
    set_number: Optional[int] = Field(default=None, gt=0)


class SetUpdate(BaseModel):
    exercise_id: Optional[int] = None
    weight: Optional[float] = Field(default=None, ge=0)
    reps: Optional[int] = Field(default=None, gt=0)
    set_number: Optional[int] = Field(default=None, gt=0)


class BulkSetUpdate(BaseModel):
    """Модель для масового оновлення підходів"""
    set_id: int
    exercise_id: Optional[int] = None
    weight: Optional[float] = Field(default=None, ge=0)
    reps: Optional[int] = Field(default=None, gt=0)
    set_number: Optional[int] = Field(default=None, gt=0)


class WorkoutWithSetsUpdate(BaseModel):
    """Модель для оновлення тренування разом з підходами"""
    date: Optional[NonEmptyStr] = None
    type: Optional[NonEmptyStr] = None
    note: Optional[NonEmptyStr] = None
    sets: Optional[list[BulkSetUpdate]] = None


class SetResponse(BaseModel):
    id: int
    workout_id: int
    exercise_id: int
    exercise_name: str
    muscle_group: str
    weight: float
    reps: int
    set_number: Optional[int]


class WorkoutResponse(BaseModel):
    id: int
    date: str
    type: str
    note: Optional[str] = None
    template_id: Optional[int] = None
    template_name: Optional[str] = None
    sets: list[SetResponse]


class WorkoutUpdate(BaseModel):
    date: Optional[NonEmptyStr] = None
    type: Optional[NonEmptyStr] = None
    note: Optional[NonEmptyStr] = None


class TemplateCreate(BaseModel):
    name: NonEmptyStr
    type: NonEmptyStr
    note: Optional[NonEmptyStr] = None


class TemplateSetResponse(BaseModel):
    id: int
    template_id: int
    exercise_id: int
    exercise_name: str
    muscle_group: str
    weight: float
    reps: int
    set_number: Optional[int]


class TemplateResponse(BaseModel):
    id: int
    name: str
    type: str
    note: Optional[str] = None
    sets: list[TemplateSetResponse]


class WorkoutListItem(BaseModel):
    id: int
    date: str
    type: str
    note: Optional[str] = None
    template_id: Optional[int] = None
    template_name: Optional[str] = None
    sets_count: int
    exercises_count: int
    total_volume: float  # загальний об'єм (вага * повтори)


class ExerciseRecord(BaseModel):
    """Модель для рекордів по вправі"""
    exercise_id: int
    exercise_name: str
    muscle_group: str
    max_weight: Optional[float] = None
    max_weight_date: Optional[str] = None
    max_weight_workout_id: Optional[int] = None
    max_reps: Optional[int] = None
    max_reps_date: Optional[str] = None
    max_reps_workout_id: Optional[int] = None
    max_reps_weight: Optional[float] = None
    max_volume: Optional[float] = None  # максимальний об'єм (вага * повтори)
    max_volume_date: Optional[str] = None
    max_volume_workout_id: Optional[int] = None
    total_sets: int
    total_workouts: int


@app.on_event("startup")
async def startup_event():
    init_db()
    seed_exercises()


@app.post("/workouts", status_code=201)
async def create_workout(workout: WorkoutCreate):
    with get_conn() as conn:
        cursor = conn.execute(
            "INSERT INTO Workouts (date, type, note) VALUES (?, ?, ?)",
            (workout.date, workout.type, workout.note)
        )
        workout_id = cursor.lastrowid
    return {"id": workout_id}


@app.post("/exercises", status_code=201)
async def create_exercise(exercise: ExerciseCreate):
    try:
        with get_conn() as conn:
            cursor = conn.execute(
                "INSERT INTO Exercises (name, muscle_group, note) VALUES (?, ?, ?)",
                (exercise.name, exercise.muscle_group, exercise.note)
            )
            exercise_id = cursor.lastrowid
        return {"id": exercise_id}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Упражнение с таким названием уже существует")


@app.patch("/exercises/{exercise_id}")
async def update_exercise(exercise_id: int, payload: ExerciseUpdate):
    if payload.name is None and payload.muscle_group is None and payload.note is None:
        raise HTTPException(status_code=400, detail="Nothing to update")

    with get_conn() as conn:
        existing = conn.execute("SELECT id FROM Exercises WHERE id = ?", (exercise_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail=f"Упражнение с id={exercise_id} не найдено")

        if payload.name is not None:
            try:
                conn.execute("UPDATE Exercises SET name = ? WHERE id = ?", (payload.name, exercise_id))
            except sqlite3.IntegrityError:
                raise HTTPException(status_code=400, detail="Упражнение с таким названием уже существует")

        if payload.muscle_group is not None:
            conn.execute("UPDATE Exercises SET muscle_group = ? WHERE id = ?", (payload.muscle_group, exercise_id))

        if payload.note is not None:
            conn.execute("UPDATE Exercises SET note = ? WHERE id = ?", (payload.note, exercise_id))

        updated = conn.execute(
            "SELECT id, name, muscle_group, note FROM Exercises WHERE id = ?",
            (exercise_id,)
        ).fetchone()

    return dict(updated)


@app.delete("/exercises/{exercise_id}", status_code=204)
async def delete_exercise(exercise_id: int):
    """Видаляє вправу"""
    with get_conn() as conn:
        # Перевіряємо чи існує вправа
        existing = conn.execute("SELECT id FROM Exercises WHERE id = ?", (exercise_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail=f"Упражнение с id={exercise_id} не найдено")
        
        # Перевіряємо чи використовується вправа в сетах
        sets_count = conn.execute(
            "SELECT COUNT(*) as count FROM Sets WHERE exercise_id = ?", 
            (exercise_id,)
        ).fetchone()["count"]
        
        if sets_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Неможливо видалити вправу: вона використовується в {sets_count} підходах. Спочатку видаліть всі підходи з цією вправою."
            )
        
        # Перевіряємо чи використовується в шаблонах
        template_sets_count = conn.execute(
            "SELECT COUNT(*) as count FROM TemplateSets WHERE exercise_id = ?", 
            (exercise_id,)
        ).fetchone()["count"]
        
        if template_sets_count > 0:
            raise HTTPException(
                status_code=400, 
                detail=f"Неможливо видалити вправу: вона використовується в {template_sets_count} шаблонах. Спочатку видаліть вправу з шаблонів."
            )
        
        # Видаляємо вправу
        cur = conn.execute("DELETE FROM Exercises WHERE id = ?", (exercise_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Exercise not found")
    
    return None


@app.get("/sets/{set_id}")
async def get_set(set_id: int):
    """Отримує інформацію про один підхід (set)"""
    with get_conn() as conn:
        set_data = conn.execute("""
            SELECT s.id, s.workout_id, s.exercise_id, e.name as exercise_name,
                   e.muscle_group, s.weight, s.reps, s.set_number
            FROM Sets s
            JOIN Exercises e ON s.exercise_id = e.id
            WHERE s.id = ?
        """, (set_id,)).fetchone()
        
        if not set_data:
            raise HTTPException(status_code=404, detail=f"Підхід с id={set_id} не найдено")
    
    return dict(set_data)


@app.post("/sets", status_code=201)
async def create_set(set_data: SetCreate):
    with get_conn() as conn:
        workout = conn.execute("SELECT id FROM Workouts WHERE id = ?", (set_data.workout_id,)).fetchone()
        if not workout:
            raise HTTPException(status_code=404, detail=f"Тренировка с id={set_data.workout_id} не найдена")

        exercise = conn.execute("SELECT id FROM Exercises WHERE id = ?", (set_data.exercise_id,)).fetchone()
        if not exercise:
            raise HTTPException(status_code=404, detail=f"Упражнение с id={set_data.exercise_id} не найдено")

        cursor = conn.execute(
            """INSERT INTO Sets (workout_id, exercise_id, weight, reps, set_number)
               VALUES (?, ?, ?, ?, ?)""",
            (set_data.workout_id, set_data.exercise_id, set_data.weight, set_data.reps, set_data.set_number)
        )
        set_id = cursor.lastrowid

    return {"id": set_id}


@app.patch("/sets/{set_id}")
async def update_set(set_id: int, payload: SetUpdate):
    """Редагує підхід (set) в тренуванні"""
    if payload.exercise_id is None and payload.weight is None and payload.reps is None and payload.set_number is None:
        raise HTTPException(status_code=400, detail="Nothing to update")

    with get_conn() as conn:
        # Перевіряємо чи існує set
        existing = conn.execute("SELECT id, workout_id FROM Sets WHERE id = ?", (set_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail=f"Підхід с id={set_id} не найдено")

        # Перевіряємо чи існує вправа, якщо змінюється
        if payload.exercise_id is not None:
            exercise = conn.execute("SELECT id FROM Exercises WHERE id = ?", (payload.exercise_id,)).fetchone()
            if not exercise:
                raise HTTPException(status_code=404, detail=f"Упражнение с id={payload.exercise_id} не найдено")

        # Оновлюємо поля
        if payload.exercise_id is not None:
            conn.execute("UPDATE Sets SET exercise_id = ? WHERE id = ?", (payload.exercise_id, set_id))
        
        if payload.weight is not None:
            conn.execute("UPDATE Sets SET weight = ? WHERE id = ?", (payload.weight, set_id))
        
        if payload.reps is not None:
            conn.execute("UPDATE Sets SET reps = ? WHERE id = ?", (payload.reps, set_id))
        
        if payload.set_number is not None:
            conn.execute("UPDATE Sets SET set_number = ? WHERE id = ?", (payload.set_number, set_id))

        # Повертаємо оновлений set з інформацією про вправу
        updated = conn.execute("""
            SELECT s.id, s.workout_id, s.exercise_id, e.name as exercise_name,
                   e.muscle_group, s.weight, s.reps, s.set_number
            FROM Sets s
            JOIN Exercises e ON s.exercise_id = e.id
            WHERE s.id = ?
        """, (set_id,)).fetchone()

    return dict(updated)


@app.delete("/sets/{set_id}", status_code=204)
async def delete_set(set_id: int):
    """Видаляє підхід (set) з тренування"""
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM Sets WHERE id = ?", (set_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail=f"Підхід с id={set_id} не найдено")
    return None


@app.put("/workouts/{workout_id}/sets", status_code=200)
async def bulk_update_workout_sets(workout_id: int, sets: list[BulkSetUpdate]):
    """Масове оновлення підходів тренування з історії"""
    if not sets:
        raise HTTPException(status_code=400, detail="Список підходів не може бути порожнім")
    
    with get_conn() as conn:
        # Перевіряємо чи існує тренування
        workout = conn.execute("SELECT id FROM Workouts WHERE id = ?", (workout_id,)).fetchone()
        if not workout:
            raise HTTPException(status_code=404, detail=f"Тренировка с id={workout_id} не найдена")
        
        updated_sets = []
        
        for set_update in sets:
            # Перевіряємо чи належить set цьому тренуванню
            existing = conn.execute(
                "SELECT id, workout_id FROM Sets WHERE id = ? AND workout_id = ?",
                (set_update.set_id, workout_id)
            ).fetchone()
            
            if not existing:
                raise HTTPException(
                    status_code=404,
                    detail=f"Підхід с id={set_update.set_id} не найдено або не належить цьому тренуванню"
                )
            
            # Перевіряємо вправу, якщо змінюється
            if set_update.exercise_id is not None:
                exercise = conn.execute(
                    "SELECT id FROM Exercises WHERE id = ?", 
                    (set_update.exercise_id,)
                ).fetchone()
                if not exercise:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Упражнение с id={set_update.exercise_id} не найдено"
                    )
            
            # Оновлюємо поля
            updates = []
            params = []
            
            if set_update.exercise_id is not None:
                updates.append("exercise_id = ?")
                params.append(set_update.exercise_id)
            
            if set_update.weight is not None:
                updates.append("weight = ?")
                params.append(set_update.weight)
            
            if set_update.reps is not None:
                updates.append("reps = ?")
                params.append(set_update.reps)
            
            if set_update.set_number is not None:
                updates.append("set_number = ?")
                params.append(set_update.set_number)
            
            if updates:
                params.append(set_update.set_id)
                conn.execute(
                    f"UPDATE Sets SET {', '.join(updates)} WHERE id = ?",
                    params
                )
            
            # Отримуємо оновлений set
            updated = conn.execute("""
                SELECT s.id, s.workout_id, s.exercise_id, e.name as exercise_name,
                       e.muscle_group, s.weight, s.reps, s.set_number
                FROM Sets s
                JOIN Exercises e ON s.exercise_id = e.id
                WHERE s.id = ?
            """, (set_update.set_id,)).fetchone()
            
            updated_sets.append(dict(updated))
        
        # Повертаємо повне оновлене тренування
        workout_full = conn.execute(
            """SELECT w.id, w.date, w.type, w.note, w.template_id, 
                      t.name as template_name
               FROM Workouts w
               LEFT JOIN Templates t ON w.template_id = t.id
               WHERE w.id = ?""",
            (workout_id,)
        ).fetchone()
        
        all_sets = conn.execute("""
            SELECT s.id, s.workout_id, s.exercise_id, e.name as exercise_name,
                   e.muscle_group, s.weight, s.reps, s.set_number
            FROM Sets s
            JOIN Exercises e ON s.exercise_id = e.id
            WHERE s.workout_id = ?
            ORDER BY s.set_number, s.id
        """, (workout_id,)).fetchall()
        
        return {
            "workout": dict(workout_full),
            "sets": [dict(s) for s in all_sets],
            "updated_count": len(updated_sets)
        }


@app.get("/")
async def root():
    return {"message": "Workout App API", "docs": "/docs", "openapi": "/openapi.json"}


@app.get("/workouts/history")
async def get_workout_history(
    type: Optional[str] = Query(None, description="Фільтр за типом тренування"),
    date_from: Optional[str] = Query(None, description="Фільтр від дати (формат: YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Фільтр до дати (формат: YYYY-MM-DD)"),
    template_id: Optional[int] = Query(None, description="Фільтр за шаблоном"),
    limit: Optional[int] = Query(None, ge=1, le=1000, description="Ліміт кількості результатів"),
    include_stats: bool = Query(True, description="Включити загальну статистику")
):
    """Отримує розширену історію тренувань з детальною інформацією та статистикою"""
    with get_conn() as conn:
        query = """
            SELECT w.id, w.date, w.type, w.note, w.template_id, 
                   t.name as template_name
            FROM Workouts w
            LEFT JOIN Templates t ON w.template_id = t.id
            WHERE 1=1
        """
        params = []
        
        if type:
            query += " AND w.type = ?"
            params.append(type)
        
        if date_from:
            query += " AND w.date >= ?"
            params.append(date_from)
        
        if date_to:
            query += " AND w.date <= ?"
            params.append(date_to)
        
        if template_id is not None:
            query += " AND w.template_id = ?"
            params.append(template_id)
        
        query += " ORDER BY w.date DESC, w.id DESC"
        
        if limit:
            query += " LIMIT ?"
            params.append(limit)
        
        rows = conn.execute(query, params).fetchall()
        
        # Додаємо статистику для кожного тренування
        result = []
        for row in rows:
            stats = conn.execute("""
                SELECT 
                    COUNT(DISTINCT s.exercise_id) as exercises_count,
                    COUNT(s.id) as sets_count,
                    COALESCE(SUM(s.weight * s.reps), 0) as total_volume
                FROM Sets s
                WHERE s.workout_id = ?
            """, (row["id"],)).fetchone()
            
            result.append(WorkoutListItem(
                id=row["id"],
                date=row["date"],
                type=row["type"],
                note=row["note"],
                template_id=row["template_id"],
                template_name=row["template_name"],
                sets_count=stats["sets_count"] or 0,
                exercises_count=stats["exercises_count"] or 0,
                total_volume=stats["total_volume"] or 0.0
            ))
    
    return result


@app.patch("/workouts/{workout_id}")
async def update_workout(workout_id: int, payload: WorkoutUpdate):
    """Редагує тренування"""
    if payload.date is None and payload.type is None and payload.note is None:
        raise HTTPException(status_code=400, detail="Nothing to update")

    with get_conn() as conn:
        existing = conn.execute("SELECT id FROM Workouts WHERE id = ?", (workout_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail=f"Тренировка с id={workout_id} не найдена")

        if payload.date is not None:
            conn.execute("UPDATE Workouts SET date = ? WHERE id = ?", (payload.date, workout_id))
        if payload.type is not None:
            conn.execute("UPDATE Workouts SET type = ? WHERE id = ?", (payload.type, workout_id))
        if payload.note is not None:
            conn.execute("UPDATE Workouts SET note = ? WHERE id = ?", (payload.note, workout_id))

        # Повертаємо оновлене тренування з інформацією про шаблон
        updated = conn.execute(
            """SELECT w.id, w.date, w.type, w.note, w.template_id, 
                      t.name as template_name
               FROM Workouts w
               LEFT JOIN Templates t ON w.template_id = t.id
               WHERE w.id = ?""",
            (workout_id,)
        ).fetchone()

    return dict(updated)


@app.put("/workouts/{workout_id}/full", status_code=200)
async def update_workout_full(workout_id: int, payload: WorkoutWithSetsUpdate):
    """Оновлює тренування разом з підходами - для зручного редагування з історії"""
    with get_conn() as conn:
        existing = conn.execute("SELECT id FROM Workouts WHERE id = ?", (workout_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail=f"Тренировка с id={workout_id} не найдена")

        # Оновлюємо дані тренування
        if payload.date is not None:
            conn.execute("UPDATE Workouts SET date = ? WHERE id = ?", (payload.date, workout_id))
        if payload.type is not None:
            conn.execute("UPDATE Workouts SET type = ? WHERE id = ?", (payload.type, workout_id))
        if payload.note is not None:
            conn.execute("UPDATE Workouts SET note = ? WHERE id = ?", (payload.note, workout_id))

        # Оновлюємо підходи, якщо вони передані
        if payload.sets is not None:
            for set_update in payload.sets:
                # Перевіряємо чи належить set цьому тренуванню
                existing_set = conn.execute(
                    "SELECT id, workout_id FROM Sets WHERE id = ? AND workout_id = ?",
                    (set_update.set_id, workout_id)
                ).fetchone()
                
                if not existing_set:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Підхід с id={set_update.set_id} не найдено або не належить цьому тренуванню"
                    )
                
                # Перевіряємо вправу, якщо змінюється
                if set_update.exercise_id is not None:
                    exercise = conn.execute(
                        "SELECT id FROM Exercises WHERE id = ?",
                        (set_update.exercise_id,)
                    ).fetchone()
                    if not exercise:
                        raise HTTPException(
                            status_code=404,
                            detail=f"Упражнение с id={set_update.exercise_id} не найдено"
                        )
                
                # Оновлюємо поля
                updates = []
                params = []
                
                if set_update.exercise_id is not None:
                    updates.append("exercise_id = ?")
                    params.append(set_update.exercise_id)
                
                if set_update.weight is not None:
                    updates.append("weight = ?")
                    params.append(set_update.weight)
                
                if set_update.reps is not None:
                    updates.append("reps = ?")
                    params.append(set_update.reps)
                
                if set_update.set_number is not None:
                    updates.append("set_number = ?")
                    params.append(set_update.set_number)
                
                if updates:
                    params.append(set_update.set_id)
                    conn.execute(
                        f"UPDATE Sets SET {', '.join(updates)} WHERE id = ?",
                        params
                    )

        # Повертаємо повне оновлене тренування з усіма підходами
        workout = conn.execute(
            """SELECT w.id, w.date, w.type, w.note, w.template_id, 
                      t.name as template_name
               FROM Workouts w
               LEFT JOIN Templates t ON w.template_id = t.id
               WHERE w.id = ?""",
            (workout_id,)
        ).fetchone()

        sets = conn.execute("""
            SELECT s.id, s.workout_id, s.exercise_id, e.name as exercise_name,
                   e.muscle_group, s.weight, s.reps, s.set_number
            FROM Sets s
            JOIN Exercises e ON s.exercise_id = e.id
            WHERE s.workout_id = ?
            ORDER BY s.set_number, s.id
        """, (workout_id,)).fetchall()

    return WorkoutResponse(
        id=workout["id"],
        date=workout["date"],
        type=workout["type"],
        note=workout["note"],
        template_id=workout["template_id"],
        template_name=workout["template_name"],
        sets=[
            SetResponse(
                id=s["id"],
                workout_id=s["workout_id"],
                exercise_id=s["exercise_id"],
                exercise_name=s["exercise_name"],
                muscle_group=s["muscle_group"],
                weight=s["weight"],
                reps=s["reps"],
                set_number=s["set_number"]
            )
            for s in sets
        ]
    )


@app.delete("/workouts/{workout_id}", status_code=204)
async def delete_workout(workout_id: int):
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM Workouts WHERE id = ?", (workout_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Workout not found")
    return None


@app.get("/workouts/history")
async def get_workout_history(
    type: Optional[str] = Query(None, description="Фільтр за типом тренування"),
    date_from: Optional[str] = Query(None, description="Фільтр від дати (формат: YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Фільтр до дати (формат: YYYY-MM-DD)"),
    template_id: Optional[int] = Query(None, description="Фільтр за шаблоном"),
    limit: Optional[int] = Query(None, ge=1, le=1000, description="Ліміт кількості результатів"),
    include_stats: bool = Query(True, description="Включити загальну статистику")
):
    """Отримує розширену історію тренувань з детальною інформацією та статистикою"""
    with get_conn() as conn:
        # Базовий запит для тренувань
        query = """
            SELECT w.id, w.date, w.type, w.note, w.template_id, 
                   t.name as template_name
            FROM Workouts w
            LEFT JOIN Templates t ON w.template_id = t.id
            WHERE 1=1
        """
        params = []
        
        if type:
            query += " AND w.type = ?"
            params.append(type)
        
        if date_from:
            query += " AND w.date >= ?"
            params.append(date_from)
        
        if date_to:
            query += " AND w.date <= ?"
            params.append(date_to)
        
        if template_id is not None:
            query += " AND w.template_id = ?"
            params.append(template_id)
        
        query += " ORDER BY w.date DESC, w.id DESC"
        
        if limit:
            query += " LIMIT ?"
            params.append(limit)
        
        rows = conn.execute(query, params).fetchall()
        
        # Формуємо детальну історію
        history = []
        for row in rows:
            # Статистика по тренуванню
            stats = conn.execute("""
                SELECT 
                    COUNT(DISTINCT s.exercise_id) as exercises_count,
                    COUNT(s.id) as sets_count,
                    COALESCE(SUM(s.weight * s.reps), 0) as total_volume,
                    COALESCE(MAX(s.weight), 0) as max_weight,
                    COALESCE(AVG(s.weight), 0) as avg_weight
                FROM Sets s
                WHERE s.workout_id = ?
            """, (row["id"],)).fetchone()
            
            # Список вправ у тренуванні
            exercises = conn.execute("""
                SELECT DISTINCT e.id, e.name, e.muscle_group
                FROM Sets s
                JOIN Exercises e ON s.exercise_id = e.id
                WHERE s.workout_id = ?
                ORDER BY e.muscle_group, e.name
            """, (row["id"],)).fetchall()
            
            # Повна інформація про всі підходи (sets) для редагування
            sets = conn.execute("""
                SELECT s.id, s.workout_id, s.exercise_id, e.name as exercise_name,
                       e.muscle_group, s.weight, s.reps, s.set_number
                FROM Sets s
                JOIN Exercises e ON s.exercise_id = e.id
                WHERE s.workout_id = ?
                ORDER BY s.set_number, s.id
            """, (row["id"],)).fetchall()
            
            # Перевіряємо чи були встановлені рекорди в цьому тренуванні
            records_achieved = []
            for s in sets:
                exercise_id = s["exercise_id"]
                weight = s["weight"]
                reps = s["reps"]
                volume = weight * reps
                
                # Перевіряємо максимальну вагу до цього тренування
                max_weight_before = conn.execute("""
                    SELECT MAX(weight) as max_weight
                    FROM Sets
                    WHERE exercise_id = ? AND workout_id < ?
                """, (exercise_id, row["id"])).fetchone()
                
                max_weight_before_value = max_weight_before["max_weight"] if max_weight_before and max_weight_before["max_weight"] else 0
                
                # Перевіряємо максимальну кількість повторень до цього тренування
                max_reps_before = conn.execute("""
                    SELECT MAX(reps) as max_reps
                    FROM Sets
                    WHERE exercise_id = ? AND workout_id < ?
                """, (exercise_id, row["id"])).fetchone()
                
                max_reps_before_value = max_reps_before["max_reps"] if max_reps_before and max_reps_before["max_reps"] else 0
                
                # Перевіряємо максимальний об'єм до цього тренування
                max_volume_before = conn.execute("""
                    SELECT MAX(weight * reps) as max_volume
                    FROM Sets
                    WHERE exercise_id = ? AND workout_id < ?
                """, (exercise_id, row["id"])).fetchone()
                
                max_volume_before_value = max_volume_before["max_volume"] if max_volume_before and max_volume_before["max_volume"] else 0
                
                # Визначаємо які рекорди були встановлені
                record_types = []
                if weight > max_weight_before_value:
                    record_types.append("max_weight")
                if reps > max_reps_before_value:
                    record_types.append("max_reps")
                if volume > max_volume_before_value:
                    record_types.append("max_volume")
                
                if record_types:
                    records_achieved.append({
                        "set_id": s["id"],
                        "exercise_id": exercise_id,
                        "exercise_name": s["exercise_name"],
                        "record_types": record_types,
                        "weight": weight,
                        "reps": reps,
                        "volume": volume
                    })
            
            workout_data = {
                "id": row["id"],
                "date": row["date"],
                "type": row["type"],
                "note": row["note"],
                "template_id": row["template_id"],
                "template_name": row["template_name"],
                "statistics": {
                    "exercises_count": stats["exercises_count"] or 0,
                    "sets_count": stats["sets_count"] or 0,
                    "total_volume": stats["total_volume"] or 0.0,
                    "max_weight": stats["max_weight"] or 0.0,
                    "avg_weight": round(stats["avg_weight"] or 0.0, 2)
                },
                "exercises": [dict(e) for e in exercises],
                "sets": [
                    {
                        "id": s["id"],
                        "workout_id": s["workout_id"],
                        "exercise_id": s["exercise_id"],
                        "exercise_name": s["exercise_name"],
                        "muscle_group": s["muscle_group"],
                        "weight": s["weight"],
                        "reps": s["reps"],
                        "set_number": s["set_number"]
                    }
                    for s in sets
                ],
                "records_achieved": records_achieved if records_achieved else None
            }
            history.append(workout_data)
        
        # Загальна статистика, якщо потрібна
        response = {"workouts": history}
        
        if include_stats and rows:
            # Побудова запиту для загальної статистики з тими ж фільтрами
            stats_query = """
                SELECT 
                    COUNT(DISTINCT w.id) as total_workouts,
                    COUNT(DISTINCT s.exercise_id) as total_unique_exercises,
                    COUNT(s.id) as total_sets,
                    COALESCE(SUM(s.weight * s.reps), 0) as total_volume,
                    COALESCE(AVG(daily_volume.vol), 0) as avg_volume_per_workout
                FROM Workouts w
                LEFT JOIN Sets s ON w.id = s.workout_id
                LEFT JOIN (
                    SELECT workout_id, SUM(weight * reps) as vol
                    FROM Sets
                    GROUP BY workout_id
                ) daily_volume ON w.id = daily_volume.workout_id
                WHERE 1=1
            """
            stats_params = []
            
            if type:
                stats_query += " AND w.type = ?"
                stats_params.append(type)
            
            if date_from:
                stats_query += " AND w.date >= ?"
                stats_params.append(date_from)
            
            if date_to:
                stats_query += " AND w.date <= ?"
                stats_params.append(date_to)
            
            if template_id is not None:
                stats_query += " AND w.template_id = ?"
                stats_params.append(template_id)
            
            total_stats = conn.execute(stats_query, stats_params).fetchone()
            
            response["summary"] = {
                "total_workouts": total_stats["total_workouts"] or 0,
                "total_unique_exercises": total_stats["total_unique_exercises"] or 0,
                "total_sets": total_stats["total_sets"] or 0,
                "total_volume": total_stats["total_volume"] or 0.0,
                "avg_volume_per_workout": round(total_stats["avg_volume_per_workout"] or 0.0, 2)
            }
        
        return response


@app.get("/workouts/{workout_id}", response_model=WorkoutResponse)
async def get_workout(workout_id: int):
    with get_conn() as conn:
        workout = conn.execute(
            """SELECT w.id, w.date, w.type, w.note, w.template_id, 
                      t.name as template_name
               FROM Workouts w
               LEFT JOIN Templates t ON w.template_id = t.id
               WHERE w.id = ?""",
            (workout_id,)
        ).fetchone()

        if not workout:
            raise HTTPException(status_code=404, detail=f"Тренировка с id={workout_id} не найдена")

        sets = conn.execute(
            """SELECT s.id, s.workout_id, s.exercise_id, e.name as exercise_name,
                      e.muscle_group, s.weight, s.reps, s.set_number
               FROM Sets s
               JOIN Exercises e ON s.exercise_id = e.id
               WHERE s.workout_id = ?
               ORDER BY s.set_number, s.id""",
            (workout_id,)
        ).fetchall()

    return WorkoutResponse(
        id=workout["id"],
        date=workout["date"],
        type=workout["type"],
        note=workout["note"],
        template_id=workout["template_id"],
        template_name=workout["template_name"],
        sets=[
            SetResponse(
                id=s["id"],
                workout_id=s["workout_id"],
                exercise_id=s["exercise_id"],
                exercise_name=s["exercise_name"],
                muscle_group=s["muscle_group"],
                weight=s["weight"],
                reps=s["reps"],
                set_number=s["set_number"]
            )
            for s in sets
        ]
    )


@app.get("/exercises")
async def list_exercises(muscle_group: str | None = None):
    with get_conn() as conn:
        if muscle_group:
            rows = conn.execute(
                "SELECT id, name, muscle_group, note FROM Exercises WHERE muscle_group = ? ORDER BY name",
                (muscle_group,)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT id, name, muscle_group, note FROM Exercises ORDER BY muscle_group, name"
            ).fetchall()
    return [dict(r) for r in rows]


@app.post("/workouts/{workout_id}/create-template", status_code=201)
async def create_template_from_workout(
    workout_id: int, 
    template_name: str = Query(..., min_length=1, description="Назва шаблону")
):
    """Створює шаблон тренування з існуючого тренування"""
    with get_conn() as conn:
        # Перевіряємо чи існує тренування
        workout = conn.execute(
            "SELECT id, type, note FROM Workouts WHERE id = ?",
            (workout_id,)
        ).fetchone()
        
        if not workout:
            raise HTTPException(status_code=404, detail=f"Тренировка с id={workout_id} не найдена")
        
        # Отримуємо всі сети цього тренування
        sets = conn.execute(
            "SELECT exercise_id, weight, reps, set_number FROM Sets WHERE workout_id = ?",
            (workout_id,)
        ).fetchall()
        
        if not sets:
            raise HTTPException(status_code=400, detail="Тренировка не содержит сетов")
        
        # Створюємо шаблон
        cursor = conn.execute(
            "INSERT INTO Templates (name, type, note) VALUES (?, ?, ?)",
            (template_name, workout["type"], workout["note"])
        )
        template_id = cursor.lastrowid
        
        # Копіюємо сети в шаблон
        template_sets_data = [
            (template_id, s["exercise_id"], s["weight"], s["reps"], s["set_number"])
            for s in sets
        ]
        conn.executemany(
            """INSERT INTO TemplateSets (template_id, exercise_id, weight, reps, set_number)
               VALUES (?, ?, ?, ?, ?)""",
            template_sets_data
        )
    
    return {"id": template_id, "message": f"Шаблон '{template_name}' успешно создан из тренировки {workout_id}"}


@app.get("/templates")
async def list_templates():
    """Отримує список всіх шаблонів"""
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, name, type, note FROM Templates ORDER BY id DESC"
        ).fetchall()
    return [dict(r) for r in rows]


@app.get("/templates/{template_id}", response_model=TemplateResponse)
async def get_template(template_id: int):
    """Отримує шаблон з усіма деталями"""
    with get_conn() as conn:
        template = conn.execute(
            "SELECT id, name, type, note FROM Templates WHERE id = ?",
            (template_id,)
        ).fetchone()
        
        if not template:
            raise HTTPException(status_code=404, detail=f"Шаблон с id={template_id} не найден")
        
        sets = conn.execute(
            """SELECT ts.id, ts.template_id, ts.exercise_id, e.name as exercise_name,
                      e.muscle_group, ts.weight, ts.reps, ts.set_number
               FROM TemplateSets ts
               JOIN Exercises e ON ts.exercise_id = e.id
               WHERE ts.template_id = ?
               ORDER BY ts.set_number, ts.id""",
            (template_id,)
        ).fetchall()
    
    return TemplateResponse(
        id=template["id"],
        name=template["name"],
        type=template["type"],
        note=template["note"],
        sets=[
            TemplateSetResponse(
                id=s["id"],
                template_id=s["template_id"],
                exercise_id=s["exercise_id"],
                exercise_name=s["exercise_name"],
                muscle_group=s["muscle_group"],
                weight=s["weight"],
                reps=s["reps"],
                set_number=s["set_number"]
            )
            for s in sets
        ]
    )


@app.post("/templates/{template_id}/create-workout", status_code=201)
async def create_workout_from_template(
    template_id: int, 
    date: str = Query(..., min_length=1, description="Дата тренування")
):
    """Створює нове тренування з шаблону"""
    with get_conn() as conn:
        # Перевіряємо чи існує шаблон
        template = conn.execute(
            "SELECT id, type, note FROM Templates WHERE id = ?",
            (template_id,)
        ).fetchone()
        
        if not template:
            raise HTTPException(status_code=404, detail=f"Шаблон с id={template_id} не найден")
        
        # Отримуємо всі сети шаблону
        template_sets = conn.execute(
            "SELECT exercise_id, weight, reps, set_number FROM TemplateSets WHERE template_id = ?",
            (template_id,)
        ).fetchall()
        
        if not template_sets:
            raise HTTPException(status_code=400, detail="Шаблон не содержит сетов")
        
        # Створюємо нове тренування з посиланням на шаблон
        cursor = conn.execute(
            "INSERT INTO Workouts (date, type, note, template_id) VALUES (?, ?, ?, ?)",
            (date, template["type"], template["note"], template_id)
        )
        workout_id = cursor.lastrowid
        
        # Копіюємо сети з шаблону в тренування
        workout_sets_data = [
            (workout_id, ts["exercise_id"], ts["weight"], ts["reps"], ts["set_number"])
            for ts in template_sets
        ]
        conn.executemany(
            """INSERT INTO Sets (workout_id, exercise_id, weight, reps, set_number)
               VALUES (?, ?, ?, ?, ?)""",
            workout_sets_data
        )
    
    return {"id": workout_id, "message": f"Тренировка создана из шаблона '{template['type']}'"}


@app.delete("/templates/{template_id}", status_code=204)
async def delete_template(template_id: int):
    """Видаляє шаблон"""
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM Templates WHERE id = ?", (template_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Template not found")
    return None


@app.get("/records")
async def get_all_records(
    sort_by: Optional[str] = Query("name", description="Сортування: name, max_weight, max_reps, max_volume, muscle_group")
):
    """Отримує всі рекорди користувача по всіх вправах з можливістю сортування"""
    with get_conn() as conn:
        # Отримуємо всі вправи
        exercises = conn.execute("""
            SELECT id, name, muscle_group
            FROM Exercises
            ORDER BY muscle_group, name
        """).fetchall()
        
        records = []
        for exercise in exercises:
            exercise_id = exercise["id"]
            
            # Максимальна вага
            max_weight_data = conn.execute("""
                SELECT s.weight, w.date, w.id as workout_id
                FROM Sets s
                JOIN Workouts w ON s.workout_id = w.id
                WHERE s.exercise_id = ?
                ORDER BY s.weight DESC, s.reps ASC
                LIMIT 1
            """, (exercise_id,)).fetchone()
            
            # Максимальна кількість повторень
            max_reps_data = conn.execute("""
                SELECT s.reps, s.weight, w.date, w.id as workout_id
                FROM Sets s
                JOIN Workouts w ON s.workout_id = w.id
                WHERE s.exercise_id = ?
                ORDER BY s.reps DESC, s.weight DESC
                LIMIT 1
            """, (exercise_id,)).fetchone()
            
            # Максимальний об'єм (вага * повтори)
            max_volume_data = conn.execute("""
                SELECT s.weight * s.reps as volume, s.weight, s.reps, w.date, w.id as workout_id
                FROM Sets s
                JOIN Workouts w ON s.workout_id = w.id
                WHERE s.exercise_id = ?
                ORDER BY (s.weight * s.reps) DESC
                LIMIT 1
            """, (exercise_id,)).fetchone()
            
            # Загальна статистика
            stats = conn.execute("""
                SELECT 
                    COUNT(s.id) as total_sets,
                    COUNT(DISTINCT s.workout_id) as total_workouts
                FROM Sets s
                WHERE s.exercise_id = ?
            """, (exercise_id,)).fetchone()
            
            record = ExerciseRecord(
                exercise_id=exercise_id,
                exercise_name=exercise["name"],
                muscle_group=exercise["muscle_group"],
                max_weight=max_weight_data["weight"] if max_weight_data else None,
                max_weight_date=max_weight_data["date"] if max_weight_data else None,
                max_weight_workout_id=max_weight_data["workout_id"] if max_weight_data else None,
                max_reps=max_reps_data["reps"] if max_reps_data else None,
                max_reps_date=max_reps_data["date"] if max_reps_data else None,
                max_reps_workout_id=max_reps_data["workout_id"] if max_reps_data else None,
                max_reps_weight=max_reps_data["weight"] if max_reps_data else None,
                max_volume=max_volume_data["volume"] if max_volume_data else None,
                max_volume_date=max_volume_data["date"] if max_volume_data else None,
                max_volume_workout_id=max_volume_data["workout_id"] if max_volume_data else None,
                total_sets=stats["total_sets"] or 0,
                total_workouts=stats["total_workouts"] or 0
            )
            
            # Додаємо тільки якщо є хоча б один рекорд
            if record.max_weight is not None or record.max_reps is not None or record.max_volume is not None:
                records.append(record)
        
        # Сортування рекордів
        if sort_by == "max_weight":
            records.sort(key=lambda x: x.max_weight if x.max_weight else 0, reverse=True)
        elif sort_by == "max_reps":
            records.sort(key=lambda x: x.max_reps if x.max_reps else 0, reverse=True)
        elif sort_by == "max_volume":
            records.sort(key=lambda x: x.max_volume if x.max_volume else 0, reverse=True)
        elif sort_by == "muscle_group":
            records.sort(key=lambda x: (x.muscle_group, x.exercise_name))
        else:  # sort_by == "name" (за замовчуванням)
            records.sort(key=lambda x: x.exercise_name)
    
    return {
        "records": records, 
        "total_exercises": len(records),
        "sorted_by": sort_by
    }


@app.get("/records/{exercise_id}")
async def get_exercise_record(exercise_id: int):
    """Отримує рекорди по конкретній вправі"""
    with get_conn() as conn:
        # Перевіряємо чи існує вправа
        exercise = conn.execute(
            "SELECT id, name, muscle_group FROM Exercises WHERE id = ?",
            (exercise_id,)
        ).fetchone()
        
        if not exercise:
            raise HTTPException(status_code=404, detail=f"Упражнение с id={exercise_id} не найдено")
        
        # Максимальна вага
        max_weight_data = conn.execute("""
            SELECT s.weight, w.date, w.id as workout_id
            FROM Sets s
            JOIN Workouts w ON s.workout_id = w.id
            WHERE s.exercise_id = ?
            ORDER BY s.weight DESC, s.reps ASC
            LIMIT 1
        """, (exercise_id,)).fetchone()
        
        # Максимальна кількість повторень
        max_reps_data = conn.execute("""
            SELECT s.reps, s.weight, w.date, w.id as workout_id
            FROM Sets s
            JOIN Workouts w ON s.workout_id = w.id
            WHERE s.exercise_id = ?
            ORDER BY s.reps DESC, s.weight DESC
            LIMIT 1
        """, (exercise_id,)).fetchone()
        
        # Максимальний об'єм (вага * повтори)
        max_volume_data = conn.execute("""
            SELECT s.weight * s.reps as volume, s.weight, s.reps, w.date, w.id as workout_id
            FROM Sets s
            JOIN Workouts w ON s.workout_id = w.id
            WHERE s.exercise_id = ?
            ORDER BY (s.weight * s.reps) DESC
            LIMIT 1
        """, (exercise_id,)).fetchone()
        
        # Загальна статистика
        stats = conn.execute("""
            SELECT 
                COUNT(s.id) as total_sets,
                COUNT(DISTINCT s.workout_id) as total_workouts,
                AVG(s.weight) as avg_weight,
                MAX(s.weight) as max_weight_value,
                AVG(s.reps) as avg_reps,
                MAX(s.reps) as max_reps_value,
                SUM(s.weight * s.reps) as total_volume
            FROM Sets s
            WHERE s.exercise_id = ?
        """, (exercise_id,)).fetchone()
        
        # Історія рекордів (топ 10 найкращих результатів)
        top_weight = conn.execute("""
            SELECT s.weight, s.reps, w.date, w.id as workout_id
            FROM Sets s
            JOIN Workouts w ON s.workout_id = w.id
            WHERE s.exercise_id = ?
            ORDER BY s.weight DESC, s.reps ASC
            LIMIT 10
        """, (exercise_id,)).fetchall()
        
        top_volume = conn.execute("""
            SELECT s.weight, s.reps, s.weight * s.reps as volume, w.date, w.id as workout_id
            FROM Sets s
            JOIN Workouts w ON s.workout_id = w.id
            WHERE s.exercise_id = ?
            ORDER BY (s.weight * s.reps) DESC
            LIMIT 10
        """, (exercise_id,)).fetchall()
        
        record = ExerciseRecord(
            exercise_id=exercise_id,
            exercise_name=exercise["name"],
            muscle_group=exercise["muscle_group"],
            max_weight=max_weight_data["weight"] if max_weight_data else None,
            max_weight_date=max_weight_data["date"] if max_weight_data else None,
            max_weight_workout_id=max_weight_data["workout_id"] if max_weight_data else None,
            max_reps=max_reps_data["reps"] if max_reps_data else None,
            max_reps_date=max_reps_data["date"] if max_reps_data else None,
            max_reps_workout_id=max_reps_data["workout_id"] if max_reps_data else None,
            max_reps_weight=max_reps_data["weight"] if max_reps_data else None,
            max_volume=max_volume_data["volume"] if max_volume_data else None,
            max_volume_date=max_volume_data["date"] if max_volume_data else None,
            max_volume_workout_id=max_volume_data["workout_id"] if max_volume_data else None,
            total_sets=stats["total_sets"] or 0,
            total_workouts=stats["total_workouts"] or 0
        )
        
        return {
            "record": record,
            "statistics": {
                "avg_weight": round(stats["avg_weight"] or 0.0, 2),
                "max_weight": stats["max_weight_value"] or 0.0,
                "avg_reps": round(stats["avg_reps"] or 0.0, 2),
                "max_reps": stats["max_reps_value"] or 0,
                "total_volume": stats["total_volume"] or 0.0
            },
            "top_weight": [dict(t) for t in top_weight],
            "top_volume": [dict(t) for t in top_volume]
        }
