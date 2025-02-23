import request from "supertest";
import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import app from "../../src/index"; // your Express app
import * as fitnessGoalsRepo from "../../src/repository/FitnessRep";
import jwt from "jsonwebtoken";

// Sample fitness goal objects
const sampleFitnessGoal = {
  id: 1,
  name: "Lose 5kg in 2 months",
  target: "Lose weight",
  progress: 0,
};

const validToken = jwt.sign(
  { id: 1, email: "john@example.com" },
  process.env.JWT_SECRET as string,
  { expiresIn: "15m" }
);

describe("Fitness Goals API Tests", () => {
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
  // GET /goals
  // ---------------------------

  describe("GET /goals", () => {
    it("should return 200 with fitness goals when goals exist", async () => {
      // Mock repository to return an array of fitness goals
      vi.spyOn(fitnessGoalsRepo, "getAllFitnessGoals").mockResolvedValue([sampleFitnessGoal]);
      const res = await request(app)
        .get("/goals")
        .set("Authorization", `Bearer ${validToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual([sampleFitnessGoal]);
    });

    it("should return 404 when no fitness goals exist", async () => {
      vi.spyOn(fitnessGoalsRepo, "getAllFitnessGoals").mockResolvedValue([]);
      const res = await request(app)
        .get("/goals")
        .set("Authorization", `Bearer ${validToken}`);
      expect(res.status).toBe(404);
    });
  });

  // ---------------------------
  // POST /goals
  // ---------------------------

  describe("POST /goals", () => {
    it("should return 400 if required fields are missing", async () => {
      const res = await request(app)
        .post("/goals")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          name: "Lose 5kg in 2 months",
          target: "Lose weight",
        });
      expect(res.status).toBe(400);
    });

    it("should return 201 on successful fitness goal creation", async () => {
      vi.spyOn(fitnessGoalsRepo, "createFitnessGoal").mockResolvedValue();

      const res = await request(app)
        .post("/goals")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
            goal_type:"weight_loss",
            target_value:81.6,
            current_progress:83.2,
            start_date:"2025-02-13",
            end_date:"2025-02-25"
        });
      expect(res.status).toBe(201);
      expect(res.body.message).toBe("Fitness goal created successfully");
    });
  });

  // ---------------------------
  // GET /goals/:goal_id
  // ---------------------------

  describe("GET /goals/:goal_id", () => {
    it("should return 404 if the fitness goal is not found", async () => {
      vi.spyOn(fitnessGoalsRepo, "getSingleFitnessGoal").mockResolvedValue([]);
      const res = await request(app)
        .get("/goals/9999") // assuming 9999 is an id that does not exist
        .send();
      expect(res.status).toBe(404);
    });

    it("should return 200 and the fitness goal details if found", async () => {
      vi.spyOn(fitnessGoalsRepo, "getSingleFitnessGoal").mockResolvedValue([sampleFitnessGoal]);
      const res = await request(app)
        .get(`/goals/${sampleFitnessGoal.id}`)
        .send();
      expect(res.status).toBe(200);
      expect(res.body).toEqual(sampleFitnessGoal);
    });
  });

  // ---------------------------
  // PATCH /goals
  // ---------------------------

  describe("PATCH /goals", () => {
    it("should return 400 if required fields are missing", async () => {
      const res = await request(app)
        .patch("/goals")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          id: 1,
          progress: 50,
        });
      expect(res.status).toBe(400);
    });

    it("should return 200 on successful fitness goal update", async () => {
      vi.spyOn(fitnessGoalsRepo, "updateFitnessGoal").mockResolvedValue();
      const goalData = {
        goal_id: 1,
        target_value:50,
        current_progress: 51,
        status: "pending",
      };
      const res = await request(app)
        .patch("/goals")
        .set("Authorization", `Bearer ${validToken}`)
        .send(goalData);
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Fitness goal updated successfully");

      console.log("res 2",res);
    });
  });

  // ---------------------------
  // DELETE /goals/:id
  // ---------------------------

  describe("DELETE /goals/:id", () => {
    it("should return 400 if goal_id is missing", async () => {
      const res = await request(app)
        .delete("/goals/")
        .set("Authorization", `Bearer ${validToken}`)
        .send();
      expect(res.status).toBe(404); // Assuming Express handles this as a 404
    });

    it("should return 200 on successful fitness goal deletion", async () => {
      vi.spyOn(fitnessGoalsRepo, "deleteFitnessGoal").mockResolvedValue();
      const res = await request(app)
        .delete(`/goals/${sampleFitnessGoal.id}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send();
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Fitness goal deleted successfully");
    });
  });
});
