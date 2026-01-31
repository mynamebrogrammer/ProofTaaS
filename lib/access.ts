type VMap = (t: string) => string;

export function computeEmployerAccess(getStatus: VMap) {
  const emailOk = getStatus("EMAIL_DOMAIN") === "APPROVED";
  const manualOk = ["PENDING", "APPROVED"].includes(getStatus("MANUAL_REVIEW"));

  const canExplore = emailOk && manualOk;

  const einOk = getStatus("EIN_LAST4") === "APPROVED";
  const sosOk = getStatus("SOS_REGISTRATION") === "APPROVED";

  const canEngage = canExplore && einOk && sosOk;

  return { canExplore, canEngage };
}
