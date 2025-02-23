// server/testing/api_testing/userRoutes.test.ts
import request from "supertest";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import app from "../../src/index"; // Your Express app
import * as UserRepository from "../../src/repository/UserRepository";

// A sample user object used in tests
const sampleUser = {
  user_id: 1,
  name: "John Doe",
  email: "john@example.com",
  password: bcrypt.hashSync("password", 10),
  phone: "1234567890",
  address: "123 Street",
};

describe("User Routes API Tests", () => {
  // Restore all mocks after each test to avoid interference
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------
  // GET /all/users and /users
  // ---------------------------

  describe("GET /all/users & GET /users", () => {
    it("should return 200 with users when users exist", async () => {
      // Mock the repository to return a non-empty user array
      vi.spyOn(UserRepository, "getAllUsers").mockResolvedValue([[sampleUser],undefined]);

      const res = await request(app).get("/all/users");
      expect(res.status).toBe(200);
      expect(res.body).toEqual([sampleUser]); // Depending on your implementation, adjust as needed
    });

    it("should return 404 when no users exist", async () => {
      // Simulate no users found
      vi.spyOn(UserRepository, "getAllUsers").mockResolvedValue([[],{}]);

      const res = await request(app).get("/all/users");
      expect(res.status).toBe(404);
    });

    it("GET /users should behave like /all/users", async () => {
      vi.spyOn(UserRepository, "getAllUsers").mockResolvedValue([[sampleUser],undefined]);
      const res = await request(app).get("/users");
      expect(res.status).toBe(200);
    });
  });

  // ---------------------------
  // POST /auth/signup
  // ---------------------------

  describe("POST /auth/signup", () => {
    it("should return 400 if required fields are missing", async () => {
      const res = await request(app)
        .post("/auth/signup")
        .send({ name: "John", email: "john@example.com" }); // missing password, phone, address
      expect(res.status).toBe(400);
    });

    it("should return 409 if user already exists", async () => {
      // Simulate existing user
      vi.spyOn(UserRepository, "getUserByEmail").mockResolvedValue([[sampleUser],undefined]);
      const res = await request(app)
        .post("/auth/signup")
        .send({
          name: "John Doe",
          email: "john@example.com",
          password: "password",
          phone: "1234567890",
          address: "123 Street",
        });
      expect(res.status).toBe(409);
    });

    it("should return 201 on successful signup", async () => {
      // Simulate no user found in the repository
      vi.spyOn(UserRepository, "getUserByEmail").mockResolvedValue([[],{}]);
      // Also mock the insert function
      vi.spyOn(UserRepository, "insertUser").mockResolvedValue([[],{}]);

      const res = await request(app)
        .post("/auth/signup")
        .send({
          name: "John Doe",
          email: "john@example.com",
          password: "password",
          phone: "1234567890",
          address: "123 Street",
        });
      expect(res.status).toBe(201);
      expect(res.body.message).toBe("Person Added Successfully");
    });
  });

  // ---------------------------
  // POST /auth/login
  // ---------------------------

  describe("POST /auth/login", () => {
    it("should return 400 if email or password is missing", async () => {
      const res = await request(app)
        .post("/auth/login")
        .send({ email: "john@example.com" }); // missing password
      expect(res.status).toBe(400);
    });

    it("should return 404 if the email is not found", async () => {
      vi.spyOn(UserRepository, "getUserByEmail").mockResolvedValue([[],{}]);
      const res = await request(app)
        .post("/auth/login")
        .send({ email: "john@example.com", password: "password" });
      expect(res.status).toBe(404);
    });

    it("should return 401 if the password is invalid", async () => {
      // Provide a hashed password different from the one supplied
      const wrongHashed = bcrypt.hashSync("differentPassword", 10);
      vi.spyOn(UserRepository, "getUserByEmail").mockResolvedValue([[{ ...sampleUser, password: wrongHashed }],{}]);
      const res = await request(app)
        .post("/auth/login")
        .send({ email: "john@example.com", password: "password" });
      expect(res.status).toBe(401);
    });

    it("should return 200 and tokens for valid login", async () => {
      vi.spyOn(UserRepository, "getUserByEmail").mockResolvedValue([[sampleUser],[]]);
      const res = await request(app)
        .post("/auth/login")
        .send({ email: "john@example.com", password: "password" });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("accessToken");
      expect(res.body).toHaveProperty("refreshToken");
    });
  });

  // ---------------------------
  // GET /single/users/ (getUserProfile)
  // ---------------------------

  describe("GET /single/users/", () => {
    it("should return 200 and user profile for authenticated user", async () => {
        vi.spyOn(UserRepository, "getUserByEmail").mockResolvedValue([[sampleUser], []]);

        const accessToken = jwt.sign(
            { id: 1, email: "john@example.com" },
            process.env.JWT_SECRET as string,
            { expiresIn: "15m" }
        );

        const res = await request(app)
            .get("/single/users/")
            .set("Authorization", `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body[0].email).toBe("john@example.com");
    });
  });


  // ---------------------------
  // PATCH /users (updateUser)
  // ---------------------------

  describe("PATCH /users", () => {
    const accessToken = jwt.sign(
      { id: 1, email: "john@example.com" },
      process.env.JWT_SECRET as string,
      { expiresIn: "15m" }
    );
  
    it("should return 400 if newPassword is not provided", async () => {
      const res = await request(app)
        .patch("/users")
        .set("Authorization", `Bearer ${accessToken}`) // ✅ Authorization header
        .send({});

        console.log("1",res.text);

      expect(res.status).toBe(400);
      expect(res.body.msg).toBe("New Password was not entered");
    });
  
    it("should return 400 if newPassword is same as old password", async () => {
      const hashedPassword = bcrypt.hashSync("password", 10);
      const sampleUser = { email: "john@example.com", password: hashedPassword };
  
      vi.spyOn(UserRepository, "getUserByEmail").mockResolvedValue([[sampleUser], {}]);
  
      const res = await request(app)
        .patch("/users")
        .set("Authorization", `Bearer ${accessToken}`) // ✅ Authorization header
        .send({ newPassword: "password" });

        console.log("2",res.text);
  
      expect(res.status).toBe(400);
      expect(res.body.msg).toBe("Old Password and New Password cannot be the same");
    });
  
    it("should return 200 on successful password update", async () => {
      const hashedOldPassword = bcrypt.hashSync("oldpassword", 10);
      const sampleUser = { email: "john@example.com", password: hashedOldPassword };
  
      vi.spyOn(UserRepository, "getUserByEmail").mockResolvedValue([[sampleUser], {}]);
      vi.spyOn(UserRepository, "updateUserPassword").mockResolvedValue([[], {}]);
  
      const res = await request(app)
        .patch("/users")
        .set("Authorization", `Bearer ${accessToken}`) // ✅ Authorization header
        .send({ newPassword: "newpassword" });
  
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("New Password updated successfully");
    });
  
    it("should return 404 if user not found", async () => {
      vi.spyOn(UserRepository, "getUserByEmail").mockResolvedValue([[], {}]); // No user found
  
      const res = await request(app)
        .patch("/users")
        .set("Authorization", `Bearer ${accessToken}`) // ✅ Authorization header
        .send({ newPassword: "newpassword" });

        console.log("3",res.text);
  
      expect(res.status).toBe(404);
      expect(res.body.msg).toBe("User not found");
    });
  });
  

  // ---------------------------
  // DELETE /users (deleteUser)
  // ---------------------------

  describe("DELETE /users", () => {
    it("should return 404 if user not found for deletion", async () => {
      vi.spyOn(UserRepository, "getUserByEmail").mockResolvedValue([[],{}]);
      const res = await request(app)
        .delete("/users")
        .send({ email: "john@example.com" });
      expect(res.status).toBe(404);
    });

    it("should return 200 on successful deletion", async () => {
      vi.spyOn(UserRepository, "getUserByEmail").mockResolvedValue([[sampleUser],[]]);
      vi.spyOn(UserRepository, "deleteUserByEmail").mockResolvedValue([[],{}]);
      const res = await request(app)
        .delete("/users")
        .send({ email: "john@example.com" });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Person was deleted successfully");
    });
  });

  // ---------------------------
  // POST /users/photo (uploadProfilePhoto)
  // ---------------------------

  describe("POST /users/photo", () => {
    it("should return 400 if no file is uploaded", async () => {
      const res = await request(app)
        .post("/users/photo")
        .field("email", "john@example.com");
      expect(res.status).toBe(400);
    });

    it("should return 200 on successful file upload", async () => {
      vi.spyOn(UserRepository, "updateUserProfilePic").mockResolvedValue([[],{}]);
      const res = await request(app)
        .post("/users/photo")
        .field("email", "john@example.com")
        .attach("photo", Buffer.from("fake image content"), "test.png");
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Profile photo updated");
    });
  });
});
