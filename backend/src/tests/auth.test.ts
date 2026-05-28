import request from "supertest";
import app from "../index";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

describe("Tasqflow API Authentication & Board Route Tests", () => {
  const testMail = `test_${Math.random().toString(36).substring(7)}@company.com`;
  const testPassword = "securepass123";
  let userToken = "";
  let constructedProjectId = "";

  beforeAll(async () => {
    // Clear test indicators if any
  });

  afterAll(async () => {
    // Purge test entities safely
    await prisma.$disconnect();
  });

  describe("POST /api/v1/auth/register", () => {
    it("should successfully register a pristine user with validated inputs", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          name: "Test Engineer User",
          email: testMail,
          password: testPassword,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user).toHaveProperty("email", testMail);
      expect(res.body.user).not.toHaveProperty("password");
    });

    it("should reject registering duplicate email targets", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          name: "Other Copier",
          email: testMail,
          password: testPassword,
        });

      expect(res.statusCode).toBe(409);
      expect(res.body).toHaveProperty("error");
    });

    it("should reject validation when password parameter under length constraints", async () => {
      const res = await request(app)
        .post("/api/v1/auth/register")
        .send({
          name: "Shorty",
          email: "shorty@company.com",
          password: "123",
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("errors");
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should gain access token when inputting accurate user values", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: testMail,
          password: testPassword,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("token");
      userToken = res.body.token;
    });

    it("should deny authentication on bad credentials", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: testMail,
          password: "wrong_password",
        });

      expect(res.statusCode).toBe(401);
    });
  });

  describe("Protected Route Permissions Validation", () => {
    it("should deny access to Project lists without presenting authorization header", async () => {
      const res = await request(app).get("/api/v1/projects");
      expect(res.statusCode).toBe(401);
    });

    it("should permit listing project entities with valid authorization header", async () => {
      const res = await request(app)
        .get("/api/v1/projects")
        .set("Authorization", `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("Task Parameter Validations", () => {
    it("should return validation error on empty strings of required task values", async () => {
      // Create project proxy first
      const projPrx = await request(app)
        .post("/api/v1/projects")
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          name: "Sprint Work",
          description: "Speed release metrics",
        });

      constructedProjectId = projPrx.body.id;

      // Attempt adding task with missing critical details
      const taskPrx = await request(app)
        .post(`/api/v1/projects/${constructedProjectId}/tasks`)
        .set("Authorization", `Bearer ${userToken}`)
        .send({
          title: "", // Empty string title triggers Zod validation issue
        });

      expect(taskPrx.statusCode).toBe(400);
      expect(taskPrx.body).toHaveProperty("errors");
    });
  });
});
