## WRKOUT / Workoutlog

Small full‑stack app for tracking workouts.

### Stack

- Backend: FastAPI + SQLite (`main.py`, `db.py`, `workouts.db`)
- Frontend: React (Create React App structure in `src/`)

### How to run

1. Backend:
   - Create venv and install deps:
     - `pip install -r requirements.txt`
   - Run API:
     - `uvicorn main:app --reload`

2. Frontend:
   - Install packages:
     - `npm install`
   - Start dev server:
     - `npm start`

Backend runs on `http://127.0.0.1:8000`, frontend on `http://localhost:3000`.

