import sqlite3
from contextlib import contextmanager

DB_PATH = "workouts.db"


def _column_exists(conn: sqlite3.Connection, table: str, column: str) -> bool:
    rows = conn.execute(f"PRAGMA table_info({table})").fetchall()
    return any(r[1] == column for r in rows)  # r[1] = name


def _add_column_if_missing(conn: sqlite3.Connection, table: str, column: str, col_def: str) -> None:
    if not _column_exists(conn, table, column):
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_def}")


def init_db():
    ddl = """
    CREATE TABLE IF NOT EXISTS Workouts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        note TEXT
    );

    CREATE TABLE IF NOT EXISTS Exercises (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        muscle_group TEXT NOT NULL,
        note TEXT
    );

    CREATE TABLE IF NOT EXISTS Sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workout_id INTEGER NOT NULL,
        exercise_id INTEGER NOT NULL,
        weight REAL NOT NULL CHECK(weight >= 0),
        reps INTEGER NOT NULL CHECK(reps > 0),
        set_number INTEGER NULL,
        FOREIGN KEY (workout_id) REFERENCES Workouts(id) ON DELETE CASCADE,
        FOREIGN KEY (exercise_id) REFERENCES Exercises(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_sets_workout_id ON Sets(workout_id);
    CREATE INDEX IF NOT EXISTS idx_sets_exercise_id ON Sets(exercise_id);

    CREATE TABLE IF NOT EXISTS Templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        note TEXT
    );

    CREATE TABLE IF NOT EXISTS TemplateSets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_id INTEGER NOT NULL,
        exercise_id INTEGER NOT NULL,
        weight REAL NOT NULL CHECK(weight >= 0),
        reps INTEGER NOT NULL CHECK(reps > 0),
        set_number INTEGER NULL,
        FOREIGN KEY (template_id) REFERENCES Templates(id) ON DELETE CASCADE,
        FOREIGN KEY (exercise_id) REFERENCES Exercises(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_template_sets_template_id ON TemplateSets(template_id);
    CREATE INDEX IF NOT EXISTS idx_template_sets_exercise_id ON TemplateSets(exercise_id);
    """

    with get_conn() as conn:
        conn.executescript(ddl)

        # миграция для старой базы, где этих колонок ещё нет
        _add_column_if_missing(conn, "Workouts", "note", "TEXT")
        _add_column_if_missing(conn, "Exercises", "note", "TEXT")
        # Додаємо поле для відстеження шаблону
        _add_column_if_missing(conn, "Workouts", "template_id", "INTEGER")
        
        # Додаємо індекс для template_id та зовнішній ключ
        try:
            conn.execute("""
                CREATE INDEX IF NOT EXISTS idx_workouts_template_id 
                ON Workouts(template_id)
            """)
            # Перевіряємо чи існує зовнішній ключ (SQLite не підтримує додавання FK через ALTER)
            # Тому просто додамо індекс, а валідацію зробимо на рівні застосунку
        except sqlite3.OperationalError:
            pass  # Індекс вже існує


def seed_exercises():
    default_exercises = [
        ("Bench Press", "Chest"),
        ("Incline Dumbbell Press", "Chest"),
        ("Dumbbell Fly", "Chest"),
        ("Push-Up", "Chest"),
        ("Cable Crossover", "Chest"),
        ("Pull-Up", "Back"),
        ("Lat Pulldown", "Back"),
        ("Barbell Row", "Back"),
        ("Seated Cable Row", "Back"),
        ("Deadlift", "Back"),
        ("Back Squat", "Legs"),
        ("Leg Press", "Legs"),
        ("Romanian Deadlift", "Legs"),
        ("Leg Extension", "Legs"),
        ("Leg Curl", "Legs"),
        ("Calf Raise", "Legs"),
        ("Overhead Press", "Shoulders"),
        ("Dumbbell Lateral Raise", "Shoulders"),
        ("Front Raise", "Shoulders"),
        ("Face Pull", "Shoulders"),
        ("Barbell Curl", "Biceps"),
        ("Dumbbell Curl", "Biceps"),
        ("Hammer Curl", "Biceps"),
        ("Tricep Pushdown", "Triceps"),
        ("Skull Crushers", "Triceps"),
        ("Dips", "Triceps"),
        ("Plank", "Core"),
        ("Crunches", "Core"),
        ("Russian Twist", "Core"),
        ("Hanging Leg Raise", "Core"),
        ("Burpees", "Full Body"),
    ]

    with get_conn() as conn:
        count = conn.execute("SELECT COUNT(*) AS c FROM Exercises").fetchone()["c"]
        if count > 0:
            return

        conn.executemany(
            "INSERT INTO Exercises (name, muscle_group) VALUES (?, ?)",
            default_exercises
        )


@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
