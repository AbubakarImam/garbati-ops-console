import type { OpsRole } from "../api/types";

// THIS IS UX, NOT SECURITY. Garbati.OpsApi/docs/DESIGN.md Section 1 and this repo's own
// docs/DESIGN.md Section 1/5 say this explicitly: hiding a nav item or a button does not stop a direct
// URL visit or a raw API call from the same role - OpsApi re-checks the real session's role on every
// single request, server-side, every time, regardless of what this file decided to render. This matrix
// exists only to put the right screens in front of the right people; the one real enforcement surface is
// Garbati.OpsApi/src/Garbati.OpsApi/Authorization/OpsRoles.cs plus each service's own role check, read
// directly from the actual source rather than paraphrased, before writing this file. Keep this as the
// ONE place that matrix is expressed client-side, so it can't silently drift out of sync with OpsApi's
// own - if OpsApi's matrix ever changes, this file is the only thing in this app that needs to change
// with it.

export const ALL_ROLES: readonly OpsRole[] = [
  "Teller",
  "CustomerServiceOfficer",
  "Supervisor",
  "ComplianceOfficer",
  "RiskOfficer",
  "Auditor",
  "Administrator",
];

// One entry per real action OpsApi's own Section 4 table rows, not per screen - a screen can combine
// more than one of these (e.g. the reversal queue screen mixes "act" and "read-only oversight" roles,
// and renders different buttons for each, same as OpsApi's own class-level vs. action-level
// [Authorize] split on ReversalRequestsController/CustomerEditRequestsController/
// JointApprovalConsoleController).
export const ROLE_MATRIX = {
  customerLookup: ALL_ROLES,
  stageCustomerEdit: ["CustomerServiceOfficer"],
  decideCustomerEdit: ["Supervisor"],
  createReversal: ["Teller", "CustomerServiceOfficer"],
  decideReversal: ["Supervisor"],
  viewReversalQueueReadOnly: ["ComplianceOfficer", "RiskOfficer", "Auditor"],
  testingConsole: ["Teller", "Supervisor"],
  staffManagement: ["Administrator"],
  decideJointApproval: ["Supervisor"],
  viewJointApprovalReadOnly: ["Auditor"],
} as const satisfies Record<string, readonly OpsRole[]>;

export function roleCan(role: OpsRole | undefined, allowed: readonly OpsRole[]): boolean {
  return role !== undefined && allowed.includes(role);
}

// Combined "may reach this screen at all" checks - a screen whose action set spans more than one
// ROLE_MATRIX row (e.g. the reversal queue, viewable by both the deciding role and the read-only
// oversight roles) is reachable by the union of both.
export function canSeeReversalQueue(role: OpsRole | undefined): boolean {
  return roleCan(role, ROLE_MATRIX.decideReversal) || roleCan(role, ROLE_MATRIX.viewReversalQueueReadOnly);
}

export function canSeeJointApprovalConsole(role: OpsRole | undefined): boolean {
  return roleCan(role, ROLE_MATRIX.decideJointApproval) || roleCan(role, ROLE_MATRIX.viewJointApprovalReadOnly);
}
