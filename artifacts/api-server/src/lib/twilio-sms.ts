import { ReplitConnectors } from "@replit/connectors-sdk";

export class SmsOutcomeUnknownError extends Error {}
export class SmsConfirmedFailureError extends Error {}

type TwilioMessageResponse = {
  sid?: string;
  code?: number | string;
  message?: string;
};

function configuredSender() {
  return process.env.TWILIO_FROM_NUMBER?.trim() ?? "";
}

function normalizeSmsNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  if (value.trim().startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return value.trim();
}

function trialGuidance(payload: TwilioMessageResponse) {
  const message = payload.message?.toLowerCase() ?? "";
  if (
    String(payload.code) === "14111" ||
    String(payload.code) === "21608" ||
    message.includes("unverified") ||
    message.includes("trial")
  ) {
    return " Twilio trial accounts can only message verified recipient numbers. Verify this phone in Twilio or upgrade the account.";
  }
  return "";
}

async function getTwilioAccountSid(connectors: ReplitConnectors) {
  const configured = process.env.TWILIO_ACCOUNT_SID?.trim();
  if (configured) return configured;

  const response = await connectors.proxy("twilio", "/2010-04-01/Accounts.json", {
    method: "GET",
  });
  if (!response.ok) {
    throw new SmsConfirmedFailureError(
      `Twilio connection returned ${response.status}. Repair the Twilio credentials in the Replit integration settings.`,
    );
  }
  const payload = await response.json() as { accounts?: Array<{ sid?: string }> };
  const accountSid = payload.accounts?.[0]?.sid;
  if (!accountSid) {
    throw new SmsConfirmedFailureError("Twilio did not return an account ID.");
  }
  return accountSid;
}

export async function getTwilioSmsStatus() {
  const senderNumber = configuredSender() || null;
  if (!senderNumber) {
    return {
      configured: false,
      provider: "twilio" as const,
      senderNumber: null,
      statusText: "Add an SMS-capable Twilio number as TWILIO_FROM_NUMBER before sending alerts.",
    };
  }

  try {
    await getTwilioAccountSid(new ReplitConnectors());
    return {
      configured: true,
      provider: "twilio" as const,
      senderNumber: normalizeSmsNumber(senderNumber),
      statusText: "Twilio is ready to send SMS alerts.",
    };
  } catch (error) {
    const statusText = error instanceof Error
      ? error.message
      : "Twilio readiness could not be verified.";
    return {
      configured: false,
      provider: "twilio" as const,
      senderNumber: normalizeSmsNumber(senderNumber),
      statusText,
    };
  }
}

export async function sendTwilioSms(to: string, body: string) {
  const from = configuredSender();
  if (!from) {
    throw new SmsConfirmedFailureError(
      "Twilio sender number is not configured. Add an SMS-capable number as TWILIO_FROM_NUMBER.",
    );
  }

  let response: Response;
  try {
    const connectors = new ReplitConnectors();
    const accountSid = await getTwilioAccountSid(connectors);
    response = await Promise.race([
      connectors.proxy(
        "twilio",
        `/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
        {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            To: normalizeSmsNumber(to),
            From: normalizeSmsNumber(from),
            Body: body,
          }).toString(),
        },
      ),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new SmsOutcomeUnknownError("Twilio did not confirm delivery within 20 seconds.")),
          20_000,
        ).unref();
      }),
    ]);
  } catch (error) {
    if (error instanceof SmsConfirmedFailureError || error instanceof SmsOutcomeUnknownError) {
      throw error;
    }
    throw new SmsOutcomeUnknownError("Twilio did not confirm whether the SMS request was accepted.");
  }

  const payload = await response.json().catch(() => ({})) as TwilioMessageResponse;
  if (!response.ok) {
    const providerMessage = payload.message ? ` ${payload.message}` : "";
    throw new SmsConfirmedFailureError(
      `Twilio returned ${response.status}.${providerMessage}${trialGuidance(payload)}`,
    );
  }
  return payload.sid ?? null;
}