from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, constr, Field
from typing import Optional
import sqlite3
from db import init_db, seed_exercises, get_conn

app = FastAPI(title="Workout App", description="API для отслеживания тренировок")

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
    sets: list[SetResponse]


class WorkoutUpdate(BaseModel):
    date: Optional[NonEmptyStr] = None
    type: Optional[NonEmptyStr] = None
    note: Optional[NonEmptyStr] = None


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


@app.get("/workouts/{workout_id}", response_model=WorkoutResponse)
async def get_workout(workout_id: int):
    with get_conn() as conn:
        workout = conn.execute(
            "SELECT id, date, type, note FROM Workouts WHERE id = ?",
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


@app.get("/")
async def root():
    return {"message": "Workout App API", "docs": "/docs", "openapi": "/openapi.json"}


@app.get("/workouts")
async def list_workouts():
    with get_conn() as conn:
        rows = conn.execute("SELECT id, date, type, note FROM Workouts ORDER BY id DESC").fetchall()
    return [dict(r) for r in rows]


@app.patch("/workouts/{workout_id}")
async def update_workout(workout_id: int, payload: WorkoutUpdate):
    if payload.date is None and payload.type is None and payload.note is None:
        raise HTTPException(status_code=400, detail="Nothing to update")

    with get_conn() as conn:
        existing = conn.execute("SELECT id FROM Workouts WHERE id = ?", (workout_id,)).fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Workout not found")

        if payload.date is not None:
            conn.execute("UPDATE Workouts SET date = ? WHERE id = ?", (payload.date, workout_id))
        if payload.type is not None:
            conn.execute("UPDATE Workouts SET type = ? WHERE id = ?", (payload.type, workout_id))
        if payload.note is not None:
            conn.execute("UPDATE Workouts SET note = ? WHERE id = ?", (payload.note, workout_id))

        updated = conn.execute(
            "SELECT id, date, type, note FROM Workouts WHERE id = ?",
            (workout_id,)
        ).fetchone()

    return dict(updated)


@app.delete("/workouts/{workout_id}", status_code=204)
async def delete_workout(workout_id: int):
    with get_conn() as conn:
        cur = conn.execute("DELETE FROM Workouts WHERE id = ?", (workout_id,))
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Workout not found")
    return None


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
