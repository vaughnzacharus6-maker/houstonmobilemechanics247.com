import { openai } from "@workspace/integrations-openai-ai-server";
import { z } from "zod/v4";

const serviceTypes = [
  "Oil Change / Fluid Service",
  "Brake Repair",
  "Battery / Electrical",
  "Tire Change / Flat",
  "Engine Diagnostics",
  "A/C / Cooling System",
  "Fuel System",
  "Transmission Service",
  "Alternator / Starter",
  "Commercial / Semi Truck Service",
  "Emergency Roadside",
  "Other",
] as const;

const vehicleTypes = [
  "Sedan",
  "SUV",
  "Pickup Truck",
  "Van / Minivan",
  "Semi Truck / Big Rig",
  "Box Truck",
  "Fleet Vehicle",
  "Other",
] as const;

const extractionSchema = z.object({
  name: z.string().trim().min(1).nullable(),
  phone: z.string().trim().min(3).nullable(),
  email: z.string().trim().nullable(),
  serviceType: z.enum(serviceTypes).nullable(),
  vehicleType: z.enum(vehicleTypes).nullable(),
  description: z.string().trim().min(1).nullable(),
  urgency: z.enum(["routine", "soon", "urgent"]).nullable(),
  notes: z.string().trim().nullable(),
  location: z.string().trim().nullable(),
  missingFields: z.array(z.string().trim().min(1)),
  uncertainFields: z.array(z.string().trim().min(1)),
});

export type ServiceCallIntakeExtraction = z.infer<typeof extractionSchema>;

const requiredFields = [
  ["name", "name"],
  ["phone", "phone number"],
  ["vehicleType", "vehicle type"],
  ["serviceType", "service needed"],
  ["description", "issue description"],
] as const;

export async function extractServiceCallIntake(
  summary: string,
): Promise<ServiceCallIntakeExtraction> {
  const completion = await openai.chat.completions.create({
    model: "gpt-5.6-terra",
    max_completion_tokens: 8192,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You extract customer service-call details from a mobile mechanic phone-call summary.

Return only valid JSON with exactly these keys:
name, phone, email, serviceType, vehicleType, description, urgency, notes, location, missingFields, uncertainFields.

Use null when the summary does not reliably provide a field. Never invent a customer detail.
serviceType must be exactly one of: ${serviceTypes.join(", ")}.
vehicleType must be exactly one of: ${vehicleTypes.join(", ")}.
urgency must be routine, soon, urgent, or null.
description should be a concise description of the mechanical issue. notes should contain special instructions or details not already in description.
missingFields must name every key detail that is absent or unusable. uncertainFields must name fields that are mentioned but unclear, contradictory, or low confidence.
Do not return the raw transcript and do not include any extra keys.`,
      },
      {
        role: "user",
        content: summary,
      },
    ],
  });

  const content = completion.choices[0]?.message.content;
  if (!content) {
    throw new Error("The AI did not return an intake draft.");
  }

  let candidate: unknown;
  try {
    candidate = JSON.parse(content);
  } catch {
    throw new Error("The AI returned an unreadable intake draft.");
  }

  const parsed = extractionSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new Error("The AI returned an incomplete intake draft.");
  }

  const missingFields = new Set(parsed.data.missingFields);
  for (const [key, label] of requiredFields) {
    if (!parsed.data[key]) missingFields.add(label);
  }

  return {
    ...parsed.data,
    missingFields: [...missingFields],
    uncertainFields: [...new Set(parsed.data.uncertainFields)],
  };
}