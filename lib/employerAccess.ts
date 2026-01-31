export type Access = { canExplore: boolean; canEngage: boolean };

export function employerAccessFromStatuses(statusByVtype: Map<string, string>): Access {
  const s = (k: string) => (statusByVtype.get(k) ?? "PENDING").toUpperCase();

  const canExplore =
    s("EMAIL_DOMAIN") === "APPROVED" &&
    (s("MANUAL_REVIEW") === "PENDING" || s("MANUAL_REVIEW") === "APPROVED");

  const canEngage =
    canExplore &&
    s("EIN_LAST4") === "APPROVED" &&
    s("SOS_REGISTRATION") === "APPROVED";

  return { canExplore, canEngage };
}
