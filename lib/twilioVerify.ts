import Twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID!;

if (!accountSid || !authToken || !verifyServiceSid) {
  throw new Error("Missing Twilio Verify env vars");
}

export const twilio = Twilio(accountSid, authToken);
export const verifySid = verifyServiceSid;