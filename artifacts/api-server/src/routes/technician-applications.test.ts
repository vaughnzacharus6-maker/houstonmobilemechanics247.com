import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { createHash, createSign, generateKeyPairSync, randomUUID, type KeyObject } from "node:crypto";
import { after, before, describe, test } from "node:test";
import express from "express";
import { eq, inArray } from "drizzle-orm";
import {
  contactsTable,
  db,
  pool,
  receiptSignaturesTable,
  receiptsTable,
  technicianApplicationsTable,
  techniciansTable,
} from "@workspace/db";
import app, { serializeRequestUrl } from "../app";
import { receiptDeliveryStatusForError } from "./portal";
import { createTechnicianApplicationsRouter } from "./technician-applications";
import { SmsConfirmedFailureError } from "../lib/twilio-sms";
import { isDispatchNotificationRecipient } from "../lib/technician-notifications";

type ResponseBody = Record<string, unknown> | Array<Record<string, unknown>>;

const testPrefix = `task-10-${randomUUID()}`;
const applicationEmail = `${testPrefix}@example.test`;
const technicianIds: number[] = [];
const applicationIds: number[] = [];
const userIds = {
  technician: `${testPrefix}-technician`,
  inactiveOwner: `${testPrefix}-inactive-owner`,
  inactiveAdmin: `${testPrefix}-inactive-admin`,
  owner: `${testPrefix}-owner`,
  admin: `${testPrefix}-admin`,
};

let server: Server;
let baseUrl: string;
let submissionResponse: { status: number; body: ResponseBody };
let applicationId: number;

function base64Url(value: string | Record<string, unknown>) {
  return Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");
}

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).log = { info: () => undefined };
    next();
  });
  app.use(
    createTechnicianApplicationsRouter({
      authResolver: (req) => ({ userId: req.header("x-test-user-id") ?? null }),
    }),
  );
  return app;
}

async function request(
  path: string,
  options: { method?: string; userId?: string; body?: Record<string, unknown> } = {},
) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.userId ? { "x-test-user-id": options.userId } : {}),
      ...(options.body ? { "content-type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  return {
    status: response.status,
    body: (await response.json()) as ResponseBody,
  };
}

async function insertTechnician(
  suffix: string,
  role: "owner" | "admin" | "technician",
  active: boolean,
) {
  const [technician] = await db
    .insert(techniciansTable)
    .values({
      clerkUserId: userIds[suffix as keyof typeof userIds],
      email: `${testPrefix}-${suffix}@example.test`,
      name: `Temporary ${suffix}`,
      role,
      active,
    })
    .returning({ id: techniciansTable.id });
  technicianIds.push(technician.id);
}

describe("technician application authorization", () => {
  before(async () => {
    server = createServer(createTestApp());
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    assert(address && typeof address === "object");
    baseUrl = `http://127.0.0.1:${address.port}`;

    await insertTechnician("technician", "technician", true);
    await insertTechnician("inactiveOwner", "owner", false);
    await insertTechnician("inactiveAdmin", "admin", false);
    await insertTechnician("owner", "owner", true);
    await insertTechnician("admin", "admin", true);

    submissionResponse = await request("/technician-applications", {
      method: "POST",
      body: {
        fullName: "Temporary Applicant",
        phone: "7135550100",
        email: applicationEmail,
        serviceArea: "Houston",
        experience: "Five years of mobile repair",
        specialties: "Diagnostics",
        availability: "Weekdays",
        introduction: "Temporary application for authorization coverage.",
      },
    });
    assert.equal(submissionResponse.status, 201);

    const [application] = await db
      .select({ id: technicianApplicationsTable.id })
      .from(technicianApplicationsTable)
      .where(eq(technicianApplicationsTable.email, applicationEmail))
      .limit(1);
    assert(application);
    applicationId = application.id;
    applicationIds.push(application.id);
  });

  after(async () => {
    if (applicationIds.length > 0) {
      await db
        .delete(technicianApplicationsTable)
        .where(inArray(technicianApplicationsTable.id, applicationIds));
    }
    if (technicianIds.length > 0) {
      await db.delete(techniciansTable).where(inArray(techniciansTable.id, technicianIds));
    }
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });

  test("public submission succeeds without exposing the application record", () => {
    assert.deepEqual(submissionResponse.body, {
      submitted: true,
      message: "Application received. Our team will review your information and follow up.",
    });
    assert.equal("id" in submissionResponse.body, false);
    assert.equal("email" in submissionResponse.body, false);
    assert.equal("fullName" in submissionResponse.body, false);
  });

  test("unauthenticated callers cannot list, inspect, or update applications", async () => {
    for (const response of [
      await request("/technician-applications"),
      await request(`/technician-applications/${applicationId}`),
      await request(`/technician-applications/${applicationId}`, {
        method: "PATCH",
        body: { status: "approved" },
      }),
    ]) {
      assert.equal(response.status, 401);
    }
  });

  test("technicians cannot list, inspect, or update applications", async () => {
    for (const response of [
      await request("/technician-applications", { userId: userIds.technician }),
      await request(`/technician-applications/${applicationId}`, { userId: userIds.technician }),
      await request(`/technician-applications/${applicationId}`, {
        method: "PATCH",
        userId: userIds.technician,
        body: { status: "approved" },
      }),
    ]) {
      assert.equal(response.status, 403);
    }
  });

  test("inactive owners and admins cannot list, inspect, or update applications", async () => {
    for (const userId of [userIds.inactiveOwner, userIds.inactiveAdmin]) {
      for (const response of [
        await request("/technician-applications", { userId }),
        await request(`/technician-applications/${applicationId}`, { userId }),
        await request(`/technician-applications/${applicationId}`, {
          method: "PATCH",
          userId,
          body: { status: "approved" },
        }),
      ]) {
        assert.equal(response.status, 403);
      }
    }
  });

  test("active owners and admins can list, inspect, and update applications", async () => {
    for (const [userId, status] of [
      [userIds.owner, "reviewing"],
      [userIds.admin, "approved"],
    ] as const) {
      const listResponse = await request("/technician-applications", { userId });
      assert.equal(listResponse.status, 200);
      assert(Array.isArray(listResponse.body));
      assert(listResponse.body.some((application) => application.id === applicationId));

      const detailResponse = await request(`/technician-applications/${applicationId}`, { userId });
      assert.equal(detailResponse.status, 200);
      assert.equal((detailResponse.body as Record<string, unknown>).id, applicationId);
      assert.equal((detailResponse.body as Record<string, unknown>).email, applicationEmail);

      const updateResponse = await request(`/technician-applications/${applicationId}`, {
        method: "PATCH",
        userId,
        body: { status, ownerNotes: `Temporary review by ${status}.` },
      });
      assert.equal(updateResponse.status, 200);
      assert.equal((updateResponse.body as Record<string, unknown>).status, status);
      assert.equal((updateResponse.body as Record<string, unknown>).ownerNotes, `Temporary review by ${status}.`);
    }
  });
});

const clerkTestPrefix = `task-12-${randomUUID()}`;
const clerkApplicationEmail = `${clerkTestPrefix}@example.test`;
const clerkTechnicianIds: number[] = [];
const clerkApplicationIds: number[] = [];
const receiptIds: number[] = [];
const serviceCallIds: number[] = [];
const clerkUserIds = {
  technician: `${clerkTestPrefix}-technician`,
  technicianTwo: `${clerkTestPrefix}-technician-two`,
  inactiveOwner: `${clerkTestPrefix}-inactive-owner`,
  inactiveAdmin: `${clerkTestPrefix}-inactive-admin`,
  owner: `${clerkTestPrefix}-owner`,
  admin: `${clerkTestPrefix}-admin`,
};
const originalClerkEnv = {
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  jwtKey: process.env.CLERK_JWT_KEY,
};

let clerkServer: Server | undefined;
let clerkBaseUrl: string;
let clerkApplicationId: number;
let clerkPrivateKey: KeyObject;
let forgedClerkPrivateKey: KeyObject;

function restoreEnvironmentVariable(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

function createTemporaryClerkSession(
  userId: string,
  options: { privateKey?: KeyObject; expiresAt?: number } = {},
) {
  const now = Math.floor(Date.now() / 1_000);
  const signingInput = `${base64Url({ typ: "JWT", alg: "RS256", kid: "temporary-test-key" })}.${base64Url({
    sub: userId,
    sid: `sess_${userId}`,
    iat: now,
    nbf: now - 1,
    exp: options.expiresAt ?? now + 60,
    azp: "http://127.0.0.1",
  })}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  return `${signingInput}.${signer.sign(options.privateKey ?? clerkPrivateKey).toString("base64url")}`;
}

async function clerkRequest(
  path: string,
  options: { method?: string; userId?: string; token?: string; body?: Record<string, unknown> } = {},
) {
  const response = await fetch(`${clerkBaseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: {
      ...(options.token || options.userId
        ? {
            authorization: `Bearer ${
              options.token ?? createTemporaryClerkSession(options.userId as string)
            }`,
          }
        : {}),
      ...(options.body ? { "content-type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  return {
    status: response.status,
    body: (await response.json()) as ResponseBody,
  };
}

async function insertClerkTechnician(
  suffix: keyof typeof clerkUserIds,
  role: "owner" | "admin" | "technician",
  active: boolean,
) {
  const [technician] = await db
    .insert(techniciansTable)
    .values({
      clerkUserId: clerkUserIds[suffix],
      email: `${clerkTestPrefix}-${suffix}@example.test`,
      name: `Temporary Clerk ${suffix}`,
      role,
      active,
    })
    .returning({ id: techniciansTable.id });
  clerkTechnicianIds.push(technician.id);
}

describe("technician application authorization through Clerk middleware", () => {
  before(async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    forgedClerkPrivateKey = generateKeyPairSync("rsa", { modulusLength: 2048 }).privateKey;
    clerkPrivateKey = privateKey;
    process.env.CLERK_SECRET_KEY = "sk_test_temporary_application_privacy";
    process.env.CLERK_PUBLISHABLE_KEY = `pk_test_${base64Url("temporary.clerk.accounts.dev$")}`;
    process.env.CLERK_JWT_KEY = publicKey.export({ type: "spki", format: "pem" }).toString();

    clerkServer = createServer(app);
    await new Promise<void>((resolve) => clerkServer!.listen(0, "127.0.0.1", resolve));
    const address = clerkServer.address();
    assert(address && typeof address === "object");
    clerkBaseUrl = `http://127.0.0.1:${address.port}`;

    await insertClerkTechnician("technician", "technician", true);
    await insertClerkTechnician("technicianTwo", "technician", true);
    await insertClerkTechnician("inactiveOwner", "owner", false);
    await insertClerkTechnician("inactiveAdmin", "admin", false);
    await insertClerkTechnician("owner", "owner", true);
    await insertClerkTechnician("admin", "admin", true);

    const [application] = await db
      .insert(technicianApplicationsTable)
      .values({
        fullName: "Temporary Clerk Applicant",
        phone: "7135550111",
        email: clerkApplicationEmail,
        serviceArea: "Houston",
        experience: "Five years of mobile repair",
        specialties: "Diagnostics",
        availability: "Weekdays",
        introduction: "Temporary application for Clerk middleware authorization coverage.",
      })
      .returning({ id: technicianApplicationsTable.id });
    clerkApplicationId = application.id;
    clerkApplicationIds.push(application.id);
  });

  after(async () => {
    if (receiptIds.length > 0) {
      await db.delete(receiptSignaturesTable).where(inArray(receiptSignaturesTable.receiptId, receiptIds));
      await db.delete(receiptsTable).where(inArray(receiptsTable.id, receiptIds));
    }
    if (serviceCallIds.length > 0) {
      await db.delete(contactsTable).where(inArray(contactsTable.id, serviceCallIds));
    }
    if (clerkApplicationIds.length > 0) {
      await db
        .delete(technicianApplicationsTable)
        .where(inArray(technicianApplicationsTable.id, clerkApplicationIds));
    }
    if (clerkTechnicianIds.length > 0) {
      await db.delete(techniciansTable).where(inArray(techniciansTable.id, clerkTechnicianIds));
    }
    if (clerkServer) {
      await new Promise<void>((resolve, reject) =>
        clerkServer!.close((error) => (error ? reject(error) : resolve())),
      );
    }
    restoreEnvironmentVariable("CLERK_SECRET_KEY", originalClerkEnv.secretKey);
    restoreEnvironmentVariable("CLERK_PUBLISHABLE_KEY", originalClerkEnv.publishableKey);
    restoreEnvironmentVariable("CLERK_JWT_KEY", originalClerkEnv.jwtKey);
  });

  test("unauthenticated requests cannot list, inspect, or update applications", async () => {
    for (const response of [
      await clerkRequest("/api/technician-applications"),
      await clerkRequest(`/api/technician-applications/${clerkApplicationId}`),
      await clerkRequest(`/api/technician-applications/${clerkApplicationId}`, {
        method: "PATCH",
        body: { status: "approved" },
      }),
    ]) {
      assert.equal(response.status, 401);
    }
  });

  test("public callers can submit an application through the full API app", async () => {
    const publicApplicationEmail = `${clerkTestPrefix}-public@example.test`;
    const response = await clerkRequest("/api/technician-applications", {
      method: "POST",
      body: {
        fullName: "Public Applicant",
        phone: "7135550112",
        email: publicApplicationEmail,
        serviceArea: "Houston",
        experience: "Three years of mobile repair",
        specialties: "Diagnostics and battery service",
        availability: "Weekends",
        introduction: "Public submission regression coverage.",
      },
    });
    assert.equal(response.status, 201);
    assert.deepEqual(response.body, {
      submitted: true,
      message: "Application received. Our team will review your information and follow up.",
    });

    const [application] = await db
      .select({ id: technicianApplicationsTable.id })
      .from(technicianApplicationsTable)
      .where(eq(technicianApplicationsTable.email, publicApplicationEmail))
      .limit(1);
    assert(application);
    clerkApplicationIds.push(application.id);
  });

  test("expired and forged sessions cannot access or update applications", async () => {
    const [beforeApplication] = await db
      .select()
      .from(technicianApplicationsTable)
      .where(eq(technicianApplicationsTable.id, clerkApplicationId))
      .limit(1);
    assert(beforeApplication);

    const rejectedTokens = [
      createTemporaryClerkSession(clerkUserIds.owner, {
        expiresAt: Math.floor(Date.now() / 1_000) - 60,
      }),
      createTemporaryClerkSession(clerkUserIds.owner, { privateKey: forgedClerkPrivateKey }),
    ];

    for (const token of rejectedTokens) {
      for (const response of [
        await clerkRequest("/api/technician-applications", { token }),
        await clerkRequest(`/api/technician-applications/${clerkApplicationId}`, { token }),
        await clerkRequest(`/api/technician-applications/${clerkApplicationId}`, {
          method: "PATCH",
          token,
          body: {
            status: "approved",
            ownerNotes: "This rejected request must not change the applicant.",
          },
        }),
      ]) {
        assert.equal(response.status, 401);
      }
    }

    const [afterApplication] = await db
      .select()
      .from(technicianApplicationsTable)
      .where(eq(technicianApplicationsTable.id, clerkApplicationId))
      .limit(1);
    assert.deepEqual(afterApplication, beforeApplication);
  });

  test("expired and forged sessions cannot reach internal technician portal handlers", async () => {
    const portalRequests = [
      { path: "/api/technicians/me" },
      { path: "/api/technicians/dashboard" },
      { path: "/api/technicians" },
      { path: "/api/calls" },
      { path: "/api/calls/1/conversation" },
      { path: "/api/tracking/sms-status" },
      { path: "/api/contracts" },
      {
        path: "/api/technicians/me",
        method: "PATCH",
        body: { availability: "available" },
      },
      {
        path: "/api/technicians",
        method: "POST",
        body: {
          email: "forged@example.test",
          name: "Forged technician",
        },
      },
      {
        path: "/api/technicians/1",
        method: "PATCH",
        body: { name: "Forged technician" },
      },
      {
        path: "/api/calls",
        method: "POST",
        body: {
          name: "Forged customer",
          phone: "7135550199",
          serviceType: "Diagnostic",
          vehicleType: "Car",
          description: "This request must not reach the call handler.",
          urgency: "normal",
          location: "Houston",
        },
      },
      {
        path: "/api/calls/1/conversation/messages",
        method: "POST",
        body: { body: "This request must not reach the conversation handler." },
      },
      {
        path: "/api/calls/intake/extract",
        method: "POST",
        body: {},
      },
      {
        path: "/api/calls/1/assign",
        method: "PATCH",
        body: { technicianId: 1 },
      },
      {
        path: "/api/calls/1/status",
        method: "PATCH",
        body: { status: "completed" },
      },
      {
        path: "/api/calls/1/pay",
        method: "PATCH",
        body: { payCents: 100 },
      },
      {
        path: "/api/calls/1/deposit",
        method: "PATCH",
        body: { method: "cash", amountCents: 100 },
      },
      {
        path: "/api/calls/1/tracking-link",
        method: "POST",
        body: {},
      },
      {
        path: "/api/calls/1/tracking-link",
        method: "DELETE",
      },
      {
        path: "/api/calls/1/tracking-sharing",
        method: "PATCH",
        body: { sharing: false },
      },
      {
        path: "/api/calls/1/tracking-location",
        method: "PATCH",
        body: { latitude: 29.7604, longitude: -95.3698 },
      },
      {
        path: "/api/contracts",
        method: "POST",
        body: {
          technicianId: 1,
          title: "Forged contract",
          startDate: "2026-08-25",
        },
      },
    ];
    const rejectedTokens = [
      createTemporaryClerkSession(clerkUserIds.owner, {
        expiresAt: Math.floor(Date.now() / 1_000) - 60,
      }),
      createTemporaryClerkSession(clerkUserIds.owner, { privateKey: forgedClerkPrivateKey }),
    ];

    for (const token of rejectedTokens) {
      for (const portalRequest of portalRequests) {
        const response = await clerkRequest(portalRequest.path, {
          method: portalRequest.method,
          token,
          body: portalRequest.body,
        });
        assert.equal(response.status, 401, `${portalRequest.method ?? "GET"} ${portalRequest.path}`);
      }
    }
  });

  test("technician and inactive owner/admin sessions cannot access applications", async () => {
    for (const userId of [
      clerkUserIds.technician,
      clerkUserIds.inactiveOwner,
      clerkUserIds.inactiveAdmin,
    ]) {
      for (const response of [
        await clerkRequest("/api/technician-applications", { userId }),
        await clerkRequest(`/api/technician-applications/${clerkApplicationId}`, { userId }),
        await clerkRequest(`/api/technician-applications/${clerkApplicationId}`, {
          method: "PATCH",
          userId,
          body: { status: "approved" },
        }),
      ]) {
        assert.equal(response.status, 403);
      }
    }
  });

  test("active owner/admin sessions can list, inspect, and update applications", async () => {
    for (const [userId, status] of [
      [clerkUserIds.owner, "reviewing"],
      [clerkUserIds.admin, "approved"],
    ] as const) {
      const listResponse = await clerkRequest("/api/technician-applications", { userId });
      assert.equal(listResponse.status, 200);
      assert(Array.isArray(listResponse.body));
      assert(listResponse.body.some((application) => application.id === clerkApplicationId));

      const detailResponse = await clerkRequest(`/api/technician-applications/${clerkApplicationId}`, {
        userId,
      });
      assert.equal(detailResponse.status, 200);
      assert.equal((detailResponse.body as Record<string, unknown>).id, clerkApplicationId);
      assert.equal((detailResponse.body as Record<string, unknown>).email, clerkApplicationEmail);

      const updateResponse = await clerkRequest(`/api/technician-applications/${clerkApplicationId}`, {
        method: "PATCH",
        userId,
        body: { status, ownerNotes: `Temporary Clerk review by ${status}.` },
      });
      assert.equal(updateResponse.status, 200);
      assert.equal((updateResponse.body as Record<string, unknown>).status, status);
      assert.equal(
        (updateResponse.body as Record<string, unknown>).ownerNotes,
        `Temporary Clerk review by ${status}.`,
      );
    }
  });

  test("redacts public receipt tokens in logs without requiring a Clerk session for the receipt route", async () => {
    const token = "customer-receipt-token-must-not-appear-in-logs";
    assert.equal(
      serializeRequestUrl(`/api/receipts/public/${token}?source=sms`),
      "/api/receipts/public/[redacted]",
    );
    assert.equal(
      serializeRequestUrl(`/api/tracking/${token}/conversation/messages`),
      "/api/tracking/[redacted]/conversation/messages",
    );

    const response = await fetch(`${clerkBaseUrl}/api/receipts/public/${token}`);
    assert.equal(response.status, 404);
  });

  test("keeps receipt management admin-only and public receipt links privacy-safe", async () => {
    assert.equal((await clerkRequest("/api/receipts")).status, 401);
    assert.equal((await clerkRequest("/api/receipts", { userId: clerkUserIds.technician })).status, 403);

    const [assignedCall] = await db
      .insert(contactsTable)
      .values({
        name: "Assigned Receipt Customer",
        phone: "+17135550126",
        email: "assigned-receipt@example.test",
        serviceType: "Brake service",
        vehicleType: "2020 Toyota Camry",
        description: "Replace front brake pads",
        location: "456 Assigned Lane, Houston TX",
        assignedTechnicianId: clerkTechnicianIds[0],
        status: "assigned",
      })
      .returning({ id: contactsTable.id });
    serviceCallIds.push(assignedCall.id);

    const technicianCreateResponse = await clerkRequest("/api/receipts", {
      method: "POST",
      userId: clerkUserIds.technician,
      body: {
        serviceCallId: assignedCall.id,
        customerName: "Assigned Receipt Customer",
        receiptDate: "2026-08-26",
        serviceDescription: "Front brake pads replaced",
        amountPaidCents: 15000,
        paymentMethod: "cash",
      },
    });
    assert.equal(technicianCreateResponse.status, 201);
    const technicianReceipt = technicianCreateResponse.body as Record<string, unknown>;
    assert.equal(technicianReceipt.customerPhone, "+17135550126");
    assert.equal(technicianReceipt.serviceCallId, assignedCall.id);
    receiptIds.push(technicianReceipt.id as number);

    assert.equal((await clerkRequest("/api/receipts", {
      method: "POST",
      userId: clerkUserIds.technician,
      body: {
        customerName: "Manual Technician Receipt",
        customerPhone: "+17135550127",
        receiptDate: "2026-08-26",
        serviceDescription: "Manual receipt should be restricted",
        amountPaidCents: 1000,
        paymentMethod: "cash",
      },
    })).status, 403);
    assert.equal((await clerkRequest("/api/receipts", {
      method: "POST",
      userId: clerkUserIds.technicianTwo,
      body: {
        serviceCallId: assignedCall.id,
        customerName: "Unauthorized Receipt",
        receiptDate: "2026-08-26",
        serviceDescription: "Another technician cannot use this call",
        amountPaidCents: 1000,
        paymentMethod: "cash",
      },
    })).status, 403);

    const createResponse = await clerkRequest("/api/receipts", {
      method: "POST",
      userId: clerkUserIds.admin,
      body: {
        customerName: "Receipt Test Customer",
        customerPhone: "+15555550123",
        customerAddress: "123 Test Lane, Houston TX",
        receiptDate: "2026-08-26",
        serviceDescription: "Authorization coverage receipt",
        amountPaidCents: 12345,
        paymentMethod: "card",
      },
    });
    assert.equal(createResponse.status, 201);
    const createdReceipt = createResponse.body as Record<string, unknown>;
    assert.equal(createdReceipt.customerPhone, "+15555550123");
    receiptIds.push(createdReceipt.id as number);

    assert.equal((await clerkRequest(`/api/receipts/${createdReceipt.id}`, {
      method: "PATCH",
      userId: clerkUserIds.technician,
      body: {
        customerName: "Unauthorized Edit",
        receiptDate: "2026-08-26",
        serviceDescription: "Should not be saved",
        amountPaidCents: 1,
        paymentMethod: "cash",
        customerPhone: "+15555550123",
      },
    })).status, 403);
    const updateResponse = await clerkRequest(`/api/receipts/${createdReceipt.id}`, {
      method: "PATCH",
      userId: clerkUserIds.admin,
      body: {
        customerName: "Receipt Test Customer Updated",
        customerPhone: "+15555550123",
        customerAddress: "123 Test Lane, Houston TX",
        receiptDate: "2026-08-27",
        serviceDescription: "Updated authorization coverage receipt",
        amountPaidCents: 23456,
        paymentMethod: "zelle",
        notes: "Edited before delivery",
      },
    });
    assert.equal(updateResponse.status, 200);
    assert.equal((updateResponse.body as Record<string, unknown>).customerName, "Receipt Test Customer Updated");
    assert.equal((updateResponse.body as Record<string, unknown>).amountPaidCents, 23456);
    assert.equal((updateResponse.body as Record<string, unknown>).receiptDate, "2026-08-27");

    const publicToken = `receipt-public-${randomUUID()}`;
    const expiredToken = `receipt-expired-${randomUUID()}`;
    const [publicReceipt, expiredReceipt] = await db
      .insert(receiptsTable)
      .values([
        {
          receiptNumber: `HMM-PUBLIC-${randomUUID()}`,
          customerName: "Public Receipt Customer",
          customerPhone: "+15555550124",
          receiptDate: "2026-08-26",
          serviceDescription: "Public receipt coverage",
          amountPaidCents: 1000,
          paymentMethod: "cash",
          createdBy: clerkUserIds.owner,
          accessTokenHash: createHash("sha256").update(publicToken).digest("hex"),
          accessTokenExpiresAt: new Date(Date.now() + 60_000),
        },
        {
          receiptNumber: `HMM-EXPIRED-${randomUUID()}`,
          customerName: "Expired Receipt Customer",
          customerPhone: "+15555550125",
          receiptDate: "2026-08-26",
          serviceDescription: "Expired receipt coverage",
          amountPaidCents: 1000,
          paymentMethod: "cash",
          createdBy: clerkUserIds.owner,
          accessTokenHash: createHash("sha256").update(expiredToken).digest("hex"),
          accessTokenExpiresAt: new Date(Date.now() - 60_000),
        },
      ])
      .returning({ id: receiptsTable.id });
    receiptIds.push(publicReceipt.id, expiredReceipt.id);

    const publicResponse = await clerkRequest(`/api/receipts/public/${publicToken}`);
    assert.equal(publicResponse.status, 200);
    assert.equal((publicResponse.body as Record<string, unknown>).receiptDate, "2026-08-26");
    assert.equal("customerPhone" in (publicResponse.body as Record<string, unknown>), false);
    assert.equal("deliveryStatus" in (publicResponse.body as Record<string, unknown>), false);
    assert.equal((await clerkRequest(`/api/receipts/public/${expiredToken}`)).status, 404);
  });

  test("payment signatures require complete consent and protect the active revision", async () => {
    const [call] = await db
      .insert(contactsTable)
      .values({
        name: "Signature Customer",
        phone: "+17135550188",
        serviceType: "Electrical repair",
        vehicleType: "2021 Ford F-150",
        description: "Replace starter",
        status: "completed",
        depositStatus: "stripe_verified",
      })
      .returning({ id: contactsTable.id });
    serviceCallIds.push(call.id);

    const createReceipt = await clerkRequest("/api/receipts", {
      method: "POST",
      userId: clerkUserIds.admin,
      body: {
        serviceCallId: call.id,
        customerName: "Signature Customer",
        receiptDate: "2026-08-30",
        serviceDescription: "Starter replacement",
        amountPaidCents: 42500,
        paymentMethod: "stripe",
      },
    });
    assert.equal(createReceipt.status, 201);
    const receiptId = (createReceipt.body as Record<string, unknown>).id as number;
    receiptIds.push(receiptId);

    assert.equal((await clerkRequest("/api/receipts/signatures")).status, 401);
    assert.equal((await clerkRequest("/api/receipts/signatures", { userId: clerkUserIds.technician })).status, 403);
    assert.equal((await clerkRequest("/api/receipts/signatures", { userId: clerkUserIds.admin })).status, 403);
    assert.equal((await clerkRequest(`/api/receipts/${receiptId}/signature-session`, { userId: clerkUserIds.admin })).status, 403);
    assert.equal((await clerkRequest(`/api/receipts/${receiptId}/signature`, {
      method: "POST",
      userId: clerkUserIds.admin,
      body: {},
    })).status, 403);
    assert.equal((await clerkRequest(`/api/receipts/${receiptId}/signature/void`, {
      method: "POST",
      userId: clerkUserIds.admin,
      body: {},
    })).status, 403);
    const session = await clerkRequest(`/api/receipts/${receiptId}/signature-session`, { userId: clerkUserIds.owner });
    assert.equal(session.status, 200);
    assert.equal((session.body as Record<string, unknown>).paymentVerificationStatus, "stripe_verified");

    const completeSignature = {
      signerName: "Signature Customer",
      electronicConsent: true,
      policyAcknowledged: true,
      signatureStrokes: [{
        points: [
          { x: 0.1, y: 0.5 },
          { x: 0.2, y: 0.3 },
          { x: 0.3, y: 0.6 },
          { x: 0.5, y: 0.2 },
          { x: 0.7, y: 0.6 },
          { x: 0.9, y: 0.4 },
        ],
      }],
    };
    assert.equal((await clerkRequest(`/api/receipts/${receiptId}/signature`, {
      method: "POST",
      userId: clerkUserIds.owner,
      body: { ...completeSignature, signerName: "   " },
    })).status, 400);
    assert.equal((await clerkRequest(`/api/receipts/${receiptId}/signature`, {
      method: "POST",
      userId: clerkUserIds.owner,
      body: { ...completeSignature, signatureStrokes: [] },
    })).status, 400);

    const signed = await clerkRequest(`/api/receipts/${receiptId}/signature`, {
      method: "POST",
      userId: clerkUserIds.owner,
      body: completeSignature,
    });
    assert.equal(signed.status, 201);
    const signatureId = (signed.body as Record<string, unknown>).id as number;
    assert.equal((await clerkRequest(`/api/receipts/${receiptId}/signature`, {
      method: "POST",
      userId: clerkUserIds.owner,
      body: completeSignature,
    })).status, 409);
    assert.equal((await clerkRequest(`/api/receipts/${receiptId}`, {
      method: "PATCH",
      userId: clerkUserIds.owner,
      body: {
        serviceCallId: call.id,
        customerName: "Changed",
        receiptDate: "2026-08-30",
        serviceDescription: "Changed",
        amountPaidCents: 42500,
        paymentMethod: "stripe",
      },
    })).status, 409);
    assert.equal((await clerkRequest(`/api/receipts/${receiptId}/signature/void`, {
      method: "POST",
      userId: clerkUserIds.owner,
      body: { signatureId: signatureId + 9999, reason: "Stale dialog" },
    })).status, 404);
    assert.equal((await clerkRequest(`/api/receipts/${receiptId}/signature/void`, {
      method: "POST",
      userId: clerkUserIds.owner,
      body: { signatureId, reason: "Customer requested a corrected signature" },
    })).status, 200);
    const resigned = await clerkRequest(`/api/receipts/${receiptId}/signature`, {
      method: "POST",
      userId: clerkUserIds.owner,
      body: completeSignature,
    });
    assert.equal(resigned.status, 201);
    assert.notEqual((resigned.body as Record<string, unknown>).id, signatureId);
    assert.equal((await clerkRequest(`/api/receipts/${receiptId}/signature/void`, {
      method: "POST",
      userId: clerkUserIds.owner,
      body: { signatureId, reason: "Stale original revision" },
    })).status, 404);
  });

  test("only a confirmed Twilio rejection produces a retryable receipt delivery state", () => {
    assert.equal(receiptDeliveryStatusForError(new SmsConfirmedFailureError("invalid recipient")), "failed");
    assert.equal(receiptDeliveryStatusForError(new Error("network response lost")), "unknown");
    assert.equal(receiptDeliveryStatusForError(new Error("receipt persistence failed")), "unknown");
  });

  test("portal role access remains enforced for valid Clerk sessions", async () => {
    for (const userId of [clerkUserIds.owner, clerkUserIds.admin]) {
      for (const path of [
        "/api/technicians/me",
        "/api/technicians/dashboard",
        "/api/technicians",
        "/api/calls",
        "/api/tracking/sms-status",
        "/api/contracts",
      ]) {
        const response = await clerkRequest(path, { userId });
        assert.equal(response.status, 200, `admin ${userId} ${path}`);
      }
    }

    for (const path of [
      "/api/technicians/me",
      "/api/technicians/dashboard",
      "/api/calls",
      "/api/contracts",
    ]) {
      const response = await clerkRequest(path, { userId: clerkUserIds.technician });
      assert.equal(response.status, 200, `technician ${path}`);
    }

    for (const path of ["/api/technicians", "/api/tracking/sms-status"]) {
      const response = await clerkRequest(path, { userId: clerkUserIds.technician });
      assert.equal(response.status, 403, `technician ${path}`);
    }
  });

  test("dispatch notifications include technicians from every dispatch lane", () => {
    assert.equal(isDispatchNotificationRecipient({ role: "technician" }), true);
    assert.equal(isDispatchNotificationRecipient({ role: "owner" }), true);
    assert.equal(isDispatchNotificationRecipient({ role: "admin" }), false);
  });

  test("open jobs are privacy-safe and only one technician can claim a job", async () => {
    const [call, nonstandardLocationCall] = await db
      .insert(contactsTable)
      .values([
        {
          name: "Private Dispatch Customer",
          phone: "+17135550199",
          email: "private-customer@example.test",
          serviceType: "No-start diagnostics for John at 123 Private Street",
          vehicleType: "John's 2018 Ford F-150 at 123 Private Street",
          description: "Meet John at 123 Private Street. Call +44 20 7946 0958 or private-customer@example.test.",
          urgency: "urgent",
          notes: "Gate code 2468",
          location: "123 Private Street, Houston, TX 77002",
          dispatchLane: "roadside",
          payCents: 18500,
          paySetAt: new Date(),
          status: "new",
        },
        {
          name: "Second Private Customer",
          phone: "+17135550200",
          email: "second-private-customer@example.test",
          serviceType: "Battery replacement for Maria behind the blue fence",
          vehicleType: "Maria's 2020 Toyota Camry behind the blue fence",
          description: "Battery replacement needed. Text 001-713-555-0200 for directions.",
          urgency: "soon",
          location: "Meet behind the blue fence near the park",
          dispatchLane: "general",
          payCents: 9000,
          paySetAt: new Date(),
          status: "new",
        },
      ])
      .returning({ id: contactsTable.id });
    serviceCallIds.push(call.id, nonstandardLocationCall.id);

    assert.equal((await clerkRequest("/api/calls/available")).status, 401);
    assert.equal((await clerkRequest("/api/calls/available", { userId: clerkUserIds.owner })).status, 403);

    const available = await clerkRequest("/api/calls/available", { userId: clerkUserIds.technician });
    assert.equal(available.status, 200);
    assert(Array.isArray(available.body));
    const preview = available.body.find((item) => item.id === call.id);
    assert(preview);
    assert.equal(preview.locationArea, "Houston area");
    assert.equal(preview.locationZip, "77002");
    assert.equal(preview.payCents, 18500);
    assert.equal(preview.serviceCategory, "diagnostics");
    assert.equal(preview.vehicleCategory, "truck");
    assert.equal(preview.vehicleYear, "2018");
    assert.equal(preview.vehicleMake, "Ford");
    assert.equal(preview.vehicleModel, "F-150");
    for (const privateField of ["name", "phone", "email", "location", "notes", "description", "serviceType", "vehicleType", "depositReference"]) {
      assert.equal(privateField in preview, false, privateField);
    }
    const serializedPreview = JSON.stringify(preview);
    for (const privateValue of ["John", "123 Private Street", "+44", "7946", "private-customer@example.test"]) {
      assert.equal(serializedPreview.includes(privateValue), false, privateValue);
    }
    const nonstandardPreview = available.body.find((item) => item.id === nonstandardLocationCall.id);
    assert(nonstandardPreview);
    assert.equal(nonstandardPreview.locationArea, "Houston area");
    assert.equal(nonstandardPreview.serviceCategory, "battery");
    assert.equal(nonstandardPreview.vehicleCategory, "car");
    assert.equal(nonstandardPreview.vehicleYear, "2020");
    assert.equal(nonstandardPreview.vehicleMake, "Toyota");
    assert.equal(nonstandardPreview.vehicleModel, "Camry");
    const serializedNonstandardPreview = JSON.stringify(nonstandardPreview);
    for (const privateValue of ["Maria", "blue fence", "001-713", "555-0200"]) {
      assert.equal(serializedNonstandardPreview.includes(privateValue), false, privateValue);
    }

    assert.equal((await clerkRequest(`/api/calls/${call.id}/preview`)).status, 401);
    assert.equal((await clerkRequest(`/api/calls/${call.id}/preview`, { userId: clerkUserIds.owner })).status, 403);
    const jobDetail = await clerkRequest(`/api/calls/${call.id}/preview`, {
      userId: clerkUserIds.technician,
    });
    assert.equal(jobDetail.status, 200);
    assert(!Array.isArray(jobDetail.body));
    const detail = jobDetail.body as Record<string, unknown>;
    assert.equal(detail.name, "Private Dispatch Customer");
    assert.equal(detail.phone, null);
    assert.equal(detail.email, "private-customer@example.test");
    assert.equal(detail.location, "123 Private Street, Houston, TX 77002");
    assert.equal(detail.vehicleType, "John's 2018 Ford F-150 at 123 Private Street");
    assert.equal(detail.notes, "Gate code 2468");
    assert.equal(String(detail.description).includes("+44 20 7946 0958"), false);
    assert.equal(String(detail.description).includes("[phone hidden]"), true);

    const results = await Promise.all([
      clerkRequest(`/api/calls/${call.id}/claim`, {
        method: "PATCH",
        userId: clerkUserIds.technician,
      }),
      clerkRequest(`/api/calls/${call.id}/claim`, {
        method: "PATCH",
        userId: clerkUserIds.technicianTwo,
      }),
    ]);
    assert.deepEqual(results.map((result) => result.status).sort(), [200, 409]);

    const [saved] = await db
      .select({
        status: contactsTable.status,
        assignedTechnicianId: contactsTable.assignedTechnicianId,
      })
      .from(contactsTable)
      .where(eq(contactsTable.id, call.id))
      .limit(1);
    assert.equal(saved.status, "assigned");
    assert(saved.assignedTechnicianId);

    const winner = results.find((result) => result.status === 200);
    assert(winner && !Array.isArray(winner.body));
    assert.equal(winner.body.id, call.id);
    assert.equal(winner.body.assignedTechnicianId, saved.assignedTechnicianId);
    assert.equal(winner.body.phone, null);

    const noLongerAvailable = await clerkRequest("/api/calls/available", {
      userId: clerkUserIds.technicianTwo,
    });
    assert(Array.isArray(noLongerAvailable.body));
    assert.equal(noLongerAvailable.body.some((item) => item.id === call.id), false);
  });

  test("technicians can save a partial profile without a phone or changing protected fields", async () => {
    const response = await clerkRequest("/api/technicians/me/profile", {
      method: "PATCH",
      userId: clerkUserIds.technician,
      body: {
        phone: "",
        specialty: "Hybrid diagnostics",
        baseAddress: "Houston 77002",
        serviceArea: "Houston metro, 25 miles",
        tools: "OBD-II scanner",
        limitations: "No heavy diesel rebuilds",
        bio: "ASE-certified mobile technician",
        role: "admin",
        active: false,
        dispatchLane: "roadside",
        availability: "busy",
      },
    });

    assert.equal(response.status, 200);
    assert.equal((response.body as Record<string, unknown>).phone, null);
    assert.equal((response.body as Record<string, unknown>).specialty, "Hybrid diagnostics");
    assert.equal((response.body as Record<string, unknown>).role, "technician");
    assert.equal((response.body as Record<string, unknown>).active, true);
    assert.equal((response.body as Record<string, unknown>).dispatchLane, "general");
    assert.equal((response.body as Record<string, unknown>).availability, "offline");
  });
});

after(async () => {
  await pool.end();
});