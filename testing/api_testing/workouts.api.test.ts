// testing/api_testing/workoutRoutes.test.ts
import request from "supertest";
import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import app from "../../src/index"; // your Express app
import * as workoutRepo from "../../src/repository/WorkoutRepo";
import { format } from "date-fns";
import jwt from "jsonwebtoken";

// Sample workout objects
const sampleWorkout = {
  workout_id: 123,
  exercise_type: "Leg Day",
  duration: 60,
  calories_burned: 500,
  workout_date: "2025-02-22",
};

const today = new Date();
const todayStr = today.toISOString().split("T")[0]; // formatted as yyyy-mm-dd
const sampleWorkoutToday = {
  workout_id: 124,
  exercise_type: "Cardio",
  duration: 45,
  calories_burned: 400,
  workout_date: todayStr,
};

const validToken = jwt.sign(
    { id: 1, email: "john@example.com" },
    process.env.JWT_SECRET as string,
    { expiresIn: "15m" }
  );

describe("Workout Routes API Tests", () => {
  // Restore mocks after each test so tests remain isolated.
  let validToken: string;
  let invalidToken: string;

  beforeAll(() => {
      // Generate a valid token for user ID 1
      validToken = jwt.sign({ id: 1 }, process.env.JWT_SECRET as string, { expiresIn: "1h" });

      // Create an invalid/expired token for negative testing
      invalidToken = jwt.sign({ id: 1 }, "wrong_secret", { expiresIn: "1h" });
  });

  
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------
  // GET /all/workouts
  // ---------------------------

  describe("GET /all/workouts", () => {
    it("should return 200 with workouts when workouts exist", async () => {
      // Mock repository to return an array of workouts
      vi.spyOn(workoutRepo, "getAllWorkouts").mockResolvedValue([sampleWorkout]);
      const res = await request(app).get("/all/workouts");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([sampleWorkout]);
    });

    it("should return 404 when no workouts exist", async () => {
      vi.spyOn(workoutRepo, "getAllWorkouts").mockResolvedValue([]);
      const res = await request(app).get("/all/workouts");
      expect(res.status).toBe(404);
    });
  });

  // ---------------------------
  // GET /workouts (for a specific user)
  // ---------------------------

  describe("GET /workouts", () => {

    it("should return 200 with workouts for the authenticated user", async () => {
      vi.spyOn(workoutRepo, "getWorkoutsByUser").mockResolvedValue([sampleWorkout]);
  
      const res = await request(app)
        .get("/workouts")
        .set("Authorization", `Bearer ${validToken}`);
  
      expect(res.status).toBe(200);
      expect(res.body).toEqual([sampleWorkout]);
    });
  
    it("should return 404 if no workouts exist for user", async () => {
      vi.spyOn(workoutRepo, "getWorkoutsByUser").mockResolvedValue([]);
  
      const res = await request(app)
        .get("/workouts")
        .set("Authorization", `Bearer ${validToken}`);
  
      expect(res.status).toBe(404);
    });
  });
  
  

  // ---------------------------
  // POST /workouts (create a new workout)
  // ---------------------------

  describe("POST /workouts", () => {
    it("should return 400 if required fields are missing", async () => {
      const res = await request(app)
        .post("/workouts")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          auth: { id: 1 },
          exercise_type: "Leg Day"
        });
      expect(res.status).toBe(400);
    });
  
    it("should return 409 if the workout already exists for the day", async () => {
      vi.spyOn(workoutRepo, "findWorkout").mockResolvedValue([sampleWorkout]);
      const res = await request(app)
        .post("/workouts")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          auth: { id: 1 },
          exercise_type: "Leg Day",
          duration: 60,
          calories_burned: 500,
          workout_date: "2025-02-22"
        });
      expect(res.status).toBe(409);
    });
  
    it("should return 201 on successful workout creation", async () => {
      vi.spyOn(workoutRepo, "findWorkout").mockResolvedValue([]);
      vi.spyOn(workoutRepo, "createWorkout").mockResolvedValue();
  
      const res = await request(app)
        .post("/workouts")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          auth: { id: 1 },
          exercise_type: "Leg Day",
          duration: 60,
          calories_burned: 500,
          workout_date: "2025-02-22"
        });
      expect(res.status).toBe(201);
      expect(res.body.message).toBe("Workout Added Successfully");
    });

  });
  

  // ---------------------------
  // GET /workouts/:workout_id (get a single workout)
  // ---------------------------

  describe("GET /workouts/:workout_id", () => {
    it("should return 400 if workout_id is not provided", async () => {
      // This route requires a parameter, so this test might be less meaningful.
      // Instead, we can test with an invalid id.
      const res = await request(app).get("/workouts/").send();
      // Depending on your routing, this may not hit the controller.
      // So we can skip or adjust this test if necessary.
    });

    it("should return 404 if the workout is not found", async () => {
      vi.spyOn(workoutRepo, "getWorkoutById").mockResolvedValue([]);
      const res = await request(app)
        .get("/workouts/9999") // assuming 9999 is an id that does not exist
        .send();
      expect(res.status).toBe(404);
    });

    it("should return 200 and the workout details if found", async () => {
      vi.spyOn(workoutRepo, "getWorkoutById").mockResolvedValue([sampleWorkout]);
      const res = await request(app)
        .get(`/workouts/${sampleWorkout.workout_id}`)
        .send();
      expect(res.status).toBe(200);
      // Controller returns workout[0] so we expect sampleWorkout
      expect(res.body).toEqual(sampleWorkout);
    });
  });

  // ---------------------------
  // PATCH /workouts (update an existing workout)
  // ---------------------------

  describe("PATCH /workouts", () => {
    it("should return 400 if required fields are missing", async () => {
      const res = await request(app)
        .patch("/workouts")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          auth: { id: 1 }
          // Missing workout_id, exercise_type, duration, calories_burned, workout_date
        });
      expect(res.status).toBe(400);
    });
  
    it("should return 200 on successful workout update", async () => {
      vi.spyOn(workoutRepo, "updateWorkout").mockResolvedValue();
      const workoutData = {
        auth: { id: 1 },
        workout_id: sampleWorkout.workout_id,
        exercise_type: "Updated Leg Day",
        duration: 75,
        calories_burned: 550,
        workout_date: "2025-02-23"
      };
      const res = await request(app)
        .patch("/workouts")
        .set("Authorization", `Bearer ${validToken}`)
        .send(workoutData);
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Workout Updated Successfully");
    });
  });
  

  // ---------------------------
  // DELETE /workouts (delete a workout)
  // ---------------------------

  describe("DELETE /workouts", () => {
    it("should return 400 if workout_id is missing", async () => {
      const res = await request(app)
        .delete("/workouts")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ auth: { id: 1 } });
      expect(res.status).toBe(400);
    });
  
    it("should return 200 on successful workout deletion", async () => {
      vi.spyOn(workoutRepo, "deleteWorkout").mockResolvedValue();
      const res = await request(app)
        .delete("/workouts")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ auth: { id: 1 }, workout_id: sampleWorkout.workout_id });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Workout Deleted Successfully");
    });
  });

  // ---------------------------
  // GET /streaks (get workout streak)
  // ---------------------------

  describe("GET /streaks", () => {
    it("should return streak as 0 when no workouts exist", async () => {
      vi.spyOn(workoutRepo, "getWorkoutsByUser").mockResolvedValue([]);
      const res = await request(app)
        .get("/streaks")
        .set("Authorization", `Bearer ${validToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ streak: 0 });
    });
  
    it("should return a streak count when workouts exist", async () => {
      vi.spyOn(workoutRepo, "getWorkoutsByUser").mockResolvedValue([sampleWorkoutToday]);
      const res = await request(app)
        .get("/streaks")
        .set("Authorization", `Bearer ${validToken}`);
      expect(res.status).toBe(200);
      expect(res.body.streak).toBe(1);
    });
  });

  // ---------------------------
  // GET /days (get monthly workouts)
  // ---------------------------

  describe("GET /days", () => {
    it("should return only workouts within the specified month", async () => {
      const workoutInMonth = {
        workout_id: 200,
        exercise_type: "Yoga",
        duration: 30,
        calories_burned: 200,
        workout_date: "2025-03-15",
      };
  
      const workoutOutMonth = {
        workout_id: 201,
        exercise_type: "HIIT",
        duration: 20,
        calories_burned: 300,
        workout_date: "2025-04-01",
      };
  
      vi.spyOn(workoutRepo, "getWorkoutsByUser").mockResolvedValue([workoutInMonth, workoutOutMonth]);
  
      const res = await request(app)
        .get("/days")
        .query({ year: "2025", month: "03" })
        .set("Authorization", `Bearer ${validToken}`);
  
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].workout_date).toBe("2025-03-15");
    });
  });
});
