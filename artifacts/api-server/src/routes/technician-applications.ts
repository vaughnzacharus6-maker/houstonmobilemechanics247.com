import { Router, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import { desc, eq } from "drizzle-orm";
import {
  GetTechnicianApplicationParams,
  GetTechnicianApplicationResponse,
  ListTechnicianApplicationsResponse,
  SubmitTechnicianApplicationBody,
  SubmitTechnicianApplicationResponse,
  UpdateTechnicianApplicationBody,
  UpdateTechnicianApplicationParams,
  UpdateTechnicianApplicationResponse,
} from "@workspace/api-zod";
import { db, technicianApplicationsTable, techniciansTable, type Technician } from "@workspace/db";

const isAdmin = (technician: Pick<Technician, "role">) =>
  technician.role === "owner" || technician.role === "admin";

type AuthResolver = (req: Request) => Pick<ReturnType<typeof getAuth>, "userId">;

export function createTechnicianApplicationsRouter({
  database = db,
  authResolver = getAuth,
}: {
  database?: typeof db;
  authResolver?: AuthResolver;
} = {}) {
  const router = Router();

  async function requireAdmin(req: Request, res: Response) {
    const auth = authResolver(req);
    if (!auth.userId) {
      res.status(401).json({ error: "Authentication required" });
      return null;
    }

    const [technician] = await database
      .select({ role: techniciansTable.role, active: techniciansTable.active })
      .from(techniciansTable)
      .where(eq(techniciansTable.clerkUserId, auth.userId))
      .limit(1);
    if (!technician || !technician.active || !isAdmin(technician)) {
      res.status(403).json({ error: "Owner or admin access required" });
      return null;
    }
    return technician;
  }

  function serializeApplication(application: typeof technicianApplicationsTable.$inferSelect) {
    return {
      id: application.id,
      fullName: application.fullName,
      phone: application.phone,
      email: application.email,
      serviceArea: application.serviceArea,
      experience: application.experience,
      specialties: application.specialties,
      availability: application.availability,
      introduction: application.introduction,
      status: application.status,
      ownerNotes: application.ownerNotes,
      reviewedAt: application.reviewedAt?.toISOString() ?? null,
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
    };
  }

  router.post("/technician-applications", async (req, res): Promise<void> => {
  const parsed = SubmitTechnicianApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Please complete all required application fields.", details: parsed.error.issues });
    return;
  }

  const [application] = await database
    .insert(technicianApplicationsTable)
    .values({
      ...parsed.data,
      phone: parsed.data.phone.trim(),
      email: parsed.data.email.trim().toLowerCase(),
      serviceArea: parsed.data.serviceArea.trim(),
      experience: parsed.data.experience.trim(),
      specialties: parsed.data.specialties.trim(),
      availability: parsed.data.availability.trim(),
      introduction: parsed.data.introduction?.trim() || null,
    })
    .returning();

  req.log.info({ applicationId: application.id }, "New technician application");
  res.status(201).json(
    SubmitTechnicianApplicationResponse.parse({
      submitted: true,
      message: "Application received. Our team will review your information and follow up.",
    }),
  );
  });

  router.get("/technician-applications", async (req, res): Promise<void> => {
  const technician = await requireAdmin(req, res);
  if (!technician) return;

  const applications = await database
    .select()
    .from(technicianApplicationsTable)
    .orderBy(desc(technicianApplicationsTable.createdAt));
  res.json(ListTechnicianApplicationsResponse.parse(applications.map(serializeApplication)));
  });

  router.get("/technician-applications/:id", async (req, res): Promise<void> => {
  const technician = await requireAdmin(req, res);
  if (!technician) return;
  const params = GetTechnicianApplicationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid application id" });
    return;
  }

  const [application] = await database
    .select()
    .from(technicianApplicationsTable)
    .where(eq(technicianApplicationsTable.id, params.data.id))
    .limit(1);
  if (!application) {
    res.status(404).json({ error: "Technician application not found" });
    return;
  }
  res.json(GetTechnicianApplicationResponse.parse(serializeApplication(application)));
  });

  router.patch("/technician-applications/:id", async (req, res): Promise<void> => {
  const technician = await requireAdmin(req, res);
  if (!technician) return;
  const params = UpdateTechnicianApplicationParams.safeParse(req.params);
  const parsed = UpdateTechnicianApplicationBody.safeParse(req.body);
  if (!params.success || !parsed.success || Object.keys(parsed.data).length === 0) {
    res.status(400).json({ error: "Provide a valid status or owner note." });
    return;
  }

  const now = new Date();
  const [updated] = await database
    .update(technicianApplicationsTable)
    .set({
      ...(parsed.data.status !== undefined ? { status: parsed.data.status } : {}),
      ...(parsed.data.ownerNotes !== undefined ? { ownerNotes: parsed.data.ownerNotes?.trim() || null } : {}),
      ...(parsed.data.status !== undefined ? { reviewedAt: now, reviewedBy: authResolver(req).userId } : {}),
      updatedAt: now,
    })
    .where(eq(technicianApplicationsTable.id, params.data.id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Technician application not found" });
    return;
  }

  req.log.info({ applicationId: updated.id, status: updated.status }, "Technician application updated");
  res.json(UpdateTechnicianApplicationResponse.parse(serializeApplication(updated)));
  });

  return router;
}

export default createTechnicianApplicationsRouter();