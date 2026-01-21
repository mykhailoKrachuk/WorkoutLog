"""
Test script for API testing
Adds test data and checks all endpoints
"""
import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

def print_response(title, response):
    """Prints request result"""
    print(f"\n{'='*60}")
    print(f"{title}")
    print(f"{'='*60}")
    print(f"Status: {response.status_code}")
    if response.status_code < 400:
        try:
            data = response.json()
            print(json.dumps(data, indent=2, ensure_ascii=False))
        except:
            print(response.text)
    else:
        print(f"Error: {response.text}")

def test_api():
    """Tests all API endpoints"""
    
    print(">>> STARTING API TEST")
    
    # 1. Check main page
    print_response("1. Main page", requests.get(f"{BASE_URL}/"))
    
    # 2. Create exercises
    exercises_data = [
        {"name": "Bench Press", "muscle_group": "Chest", "note": "Horizontal press"},
        {"name": "Squat", "muscle_group": "Legs", "note": "Barbell squat"},
        {"name": "Deadlift", "muscle_group": "Back", "note": "Deadlift"},
        {"name": "Overhead Press", "muscle_group": "Shoulders", "note": "Overhead press"},
        {"name": "Pull-Up", "muscle_group": "Back", "note": "Pull-ups"}
    ]
    
    exercise_ids = []
    print("\n[1] Creating/Getting exercises...")
    # First get existing exercises
    existing_exercises = requests.get(f"{BASE_URL}/exercises").json()
    exercise_map = {ex['name']: ex['id'] for ex in existing_exercises}
    
    for ex in exercises_data:
        if ex['name'] in exercise_map:
            exercise_id = exercise_map[ex['name']]
            exercise_ids.append(exercise_id)
            print(f"[OK] Using existing exercise: {ex['name']} (ID: {exercise_id})")
        else:
            response = requests.post(f"{BASE_URL}/exercises", json=ex)
            if response.status_code == 201:
                exercise_id = response.json()["id"]
                exercise_ids.append(exercise_id)
                print(f"[OK] Created exercise: {ex['name']} (ID: {exercise_id})")
            else:
                print(f"[ERROR] Error creating {ex['name']}: {response.text}")
    
    # 3. Get exercises list
    print_response("2. All exercises list", requests.get(f"{BASE_URL}/exercises"))
    
    # 4. Create workouts
    today = datetime.now()
    workouts_data = [
        {"date": (today - timedelta(days=2)).strftime("%Y-%m-%d"), "type": "Upper Body", "note": "Upper body workout"},
        {"date": (today - timedelta(days=1)).strftime("%Y-%m-%d"), "type": "Lower Body", "note": "Lower body workout"},
        {"date": today.strftime("%Y-%m-%d"), "type": "Full Body", "note": "Full body workout"}
    ]
    
    workout_ids = []
    print("\n[2] Creating workouts...")
    for wo in workouts_data:
        response = requests.post(f"{BASE_URL}/workouts", json=wo)
        if response.status_code == 201:
            workout_id = response.json()["id"]
            workout_ids.append(workout_id)
            print(f"[OK] Created workout: {wo['type']} (ID: {workout_id})")
        else:
            print(f"[ERROR] Error creating workout: {response.text}")
    
    # 5. Add sets
    sets_data = [
        # Workout 1 - Upper Body
        {"workout_id": workout_ids[0], "exercise_id": exercise_ids[0], "weight": 80.0, "reps": 8, "set_number": 1},
        {"workout_id": workout_ids[0], "exercise_id": exercise_ids[0], "weight": 85.0, "reps": 6, "set_number": 2},
        {"workout_id": workout_ids[0], "exercise_id": exercise_ids[0], "weight": 90.0, "reps": 4, "set_number": 3},
        {"workout_id": workout_ids[0], "exercise_id": exercise_ids[3], "weight": 50.0, "reps": 10, "set_number": 1},
        {"workout_id": workout_ids[0], "exercise_id": exercise_ids[4], "weight": 0.0, "reps": 12, "set_number": 1},
        
        # Workout 2 - Lower Body
        {"workout_id": workout_ids[1], "exercise_id": exercise_ids[1], "weight": 100.0, "reps": 10, "set_number": 1},
        {"workout_id": workout_ids[1], "exercise_id": exercise_ids[1], "weight": 110.0, "reps": 8, "set_number": 2},
        {"workout_id": workout_ids[1], "exercise_id": exercise_ids[1], "weight": 120.0, "reps": 6, "set_number": 3},
        {"workout_id": workout_ids[1], "exercise_id": exercise_ids[2], "weight": 150.0, "reps": 5, "set_number": 1},
        
        # Workout 3 - Full Body (with records)
        {"workout_id": workout_ids[2], "exercise_id": exercise_ids[0], "weight": 95.0, "reps": 6, "set_number": 1},  # Weight record!
        {"workout_id": workout_ids[2], "exercise_id": exercise_ids[0], "weight": 90.0, "reps": 10, "set_number": 2},  # Reps record!
        {"workout_id": workout_ids[2], "exercise_id": exercise_ids[1], "weight": 130.0, "reps": 8, "set_number": 1},  # Weight record!
        {"workout_id": workout_ids[2], "exercise_id": exercise_ids[1], "weight": 100.0, "reps": 15, "set_number": 2},  # Reps record!
    ]
    
    set_ids = []
    print("\n[3] Adding sets...")
    for s in sets_data:
        response = requests.post(f"{BASE_URL}/sets", json=s)
        if response.status_code == 201:
            set_id = response.json()["id"]
            set_ids.append(set_id)
            print(f"[OK] Added set: {s['weight']}kg x {s['reps']} (ID: {set_id})")
        else:
            print(f"[ERROR] Error adding set: {response.text}")
    
    # 6. Get workout details
    if workout_ids:
        print_response(f"3. Workout details ID={workout_ids[0]}", 
                      requests.get(f"{BASE_URL}/workouts/{workout_ids[0]}"))
    
    # 7. List workouts
    print_response("4. All workouts list", requests.get(f"{BASE_URL}/workouts"))
    
    # 8. Create template from workout
    template_id = None
    if workout_ids:
        template_name = "My Upper Body workout"
        print(f"\n[4] Creating template from workout {workout_ids[0]}...")
        response = requests.post(
            f"{BASE_URL}/workouts/{workout_ids[0]}/create-template",
            params={"template_name": template_name}
        )
        if response.status_code == 201:
            template_id = response.json()["id"]
            print(f"[OK] Created template: {template_name} (ID: {template_id})")
            print_response("5. Created template info", 
                          requests.get(f"{BASE_URL}/templates/{template_id}"))
        else:
            print(f"[ERROR] Error creating template: {response.text}")
    
    # 9. Create workout from template
    if template_id:
        new_date = (today + timedelta(days=1)).strftime("%Y-%m-%d")
        print(f"\n[5] Creating workout from template {template_id}...")
        response = requests.post(
            f"{BASE_URL}/templates/{template_id}/create-workout",
            params={"date": new_date}
        )
        if response.status_code == 201:
            new_workout_id = response.json()["id"]
            print(f"[OK] Created workout from template (ID: {new_workout_id})")
        else:
            print(f"[ERROR] Error creating workout from template: {response.text}")
    
    # 10. List templates
    print_response("6. All templates list", requests.get(f"{BASE_URL}/templates"))
    
    # 11. Records (all)
    print_response("7. All records (sorted by name)", 
                  requests.get(f"{BASE_URL}/records"))
    
    # 12. Records sorted by volume
    print_response("8. Records (sorted by volume - weight x reps)", 
                  requests.get(f"{BASE_URL}/records?sort_by=max_volume"))
    
    # 13. Records sorted by weight
    print_response("9. Records (sorted by weight)", 
                  requests.get(f"{BASE_URL}/records?sort_by=max_weight"))
    
    # 14. Records sorted by reps
    print_response("10. Records (sorted by reps)", 
                  requests.get(f"{BASE_URL}/records?sort_by=max_reps"))
    
    # 15. Exercise records
    if exercise_ids:
        print_response(f"11. Exercise records ID={exercise_ids[0]}", 
                      requests.get(f"{BASE_URL}/records/{exercise_ids[0]}"))
    
    # 16. Workout history
    print_response("12. Workout history with details", 
                  requests.get(f"{BASE_URL}/workouts/history"))
    
    # 17. History with filters
    print_response("13. Workout history (last 5)", 
                  requests.get(f"{BASE_URL}/workouts/history?limit=5"))
    
    # 18. Test editing
    if workout_ids:
        print("\n[6] Testing editing...")
        update_data = {"note": "Updated note"}
        response = requests.patch(f"{BASE_URL}/workouts/{workout_ids[0]}", json=update_data)
        if response.status_code == 200:
            print(f"[OK] Workout updated")
            print_response("14. Updated workout", response)
    
    # 19. Test set editing
    if set_ids:
        print("\n[7] Editing set...")
        update_set_data = {"weight": 100.0, "reps": 8}
        response = requests.patch(f"{BASE_URL}/sets/{set_ids[0]}", json=update_set_data)
        if response.status_code == 200:
            print(f"[OK] Set updated")
            print_response("15. Updated set", response)
    
    # 20. Test exercise editing
    if exercise_ids:
        print("\n[8] Editing exercise...")
        update_ex_data = {"note": "Updated exercise note"}
        response = requests.patch(f"{BASE_URL}/exercises/{exercise_ids[0]}", json=update_ex_data)
        if response.status_code == 200:
            print(f"[OK] Exercise updated")
            print_response("16. Updated exercise", response)
    
    print("\n" + "="*60)
    print("[SUCCESS] TESTING COMPLETED!")
    print("="*60)
    print("\nSummary:")
    print(f"  - Created exercises: {len(exercise_ids)}")
    print(f"  - Created workouts: {len(workout_ids)}")
    print(f"  - Added sets: {len(set_ids)}")
    if template_id:
        print(f"  - Created templates: 1 (ID: {template_id})")
    print("\nOpen http://localhost:8000/docs for interactive testing")

if __name__ == "__main__":
    try:
        # Check if server is running
        response = requests.get(f"{BASE_URL}/")
        if response.status_code != 200:
            print(f"[ERROR] Server not responding at {BASE_URL}")
            print("Start server with: uvicorn main:app --reload")
            exit(1)
        
        test_api()
    except requests.exceptions.ConnectionError:
        print(f"[ERROR] Cannot connect to {BASE_URL}")
        print("Make sure server is running:")
        print("  uvicorn main:app --reload")
        exit(1)
    except Exception as e:
        print(f"[ERROR] Error: {e}")
        exit(1)
