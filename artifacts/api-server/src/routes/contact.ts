import { Router } from "express";
import { getAuth } from "@clerk/express";
import { db, contactsTable, techniciansTable } from "@workspace/db";
import { SubmitContactBody, SubmitContactResponse } from "@workspace/api-zod";
import { desc, eq } from "drizzle-orm";

const router = Router();

router.post("/contact", async (req, res) => {
  const parsed = SubmitContactBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ issues: parsed.error.issues }, "Rejected invalid contact submission");
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }
  const [contact] = await db.insert(contactsTable).values({
    ...parsed.data,
    urgency: parsed.data.urgency ?? "routine",
  }).returning();
  req.log.info({ contactId: contact.id }, "New contact submission");
  res.status(201).json(SubmitContactResponse.parse({
    ...contact,
    createdAt: contact.createdAt.toISOString(),
  }));
});

router.get("/contact", async (req, res) => {
  const auth = getAuth(req);
  if (!auth.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const [technician] = await db
    .select({ role: techniciansTable.role })
    .from(techniciansTable)
    .where(eq(techniciansTable.clerkUserId, auth.userId))
    .limit(1);
  if (!technician || (technician.role !== "owner" && technician.role !== "admin")) {
    res.status(403).json({ error: "Owner or admin access required" });
    return;
  }
  const contacts = await db.select().from(contactsTable).orderBy(desc(contactsTable.createdAt));
  res.json(contacts.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })));
});

export default router;
