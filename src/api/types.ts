// TypeScript mirrors of Garbati.OpsApi's real response/request contracts
// (Garbati.OpsApi/src/Garbati.OpsApi/Contracts/{Requests,Responses}/*.cs and
// Clients/Contracts/StaffIdentity/*.cs for the staff-management pass-through). Field-for-field, in the
// order the C# record declares them - not invented shapes. ASP.NET Core's default System.Text.Json
// naming policy (camelCase, no custom JsonOptions in Program.cs) is why every field below is camelCase
// even though the C# property names are PascalCase.
//
// Kept as one file, hand-written rather than generated, per the task file's explicit either/or ("generate
// or hand-write matching TypeScript types ... your call, but they must match field-for-field").

// ---------------------------------------------------------------------------------------------------
// Session (SessionController / Contracts/Responses/MeResponse.cs, Contracts/Requests/LoginRequest.cs)
// ---------------------------------------------------------------------------------------------------

export interface MeResponse {
  staffId: string;
  fullName: string;
  role: OpsRole;
}

export interface LoginRequest {
  username: string;
  password: string;
}

// Authorization/OpsRoles.cs's own seven values - this is the ONE place `role` lives client-side
// (DESIGN.md Section 4). A string union, not an enum, so an unrecognized value from the server (a role
// added server-side before this app knows about it) still passes through at compile time rather than
// becoming a type error - the nav matrix (src/auth/roles.ts) simply shows nothing extra for it.
export type OpsRole =
  | "Teller"
  | "CustomerServiceOfficer"
  | "Supervisor"
  | "ComplianceOfficer"
  | "RiskOfficer"
  | "Auditor"
  | "Administrator";

// ---------------------------------------------------------------------------------------------------
// Customer & account lookup (CustomerLookupController / Contracts/Responses/CustomerLookupResponse.cs)
// ---------------------------------------------------------------------------------------------------

export interface CustomerLookupResponse {
  customerId: string;
  customerReference: string | null;
  customerStatus: string;
  kycStatus: string;
  kycTier: string | null;
  jurisdictionCode: string;
  accountNumber: string | null;
  accountName: string | null;
  accountType: string | null;
  accountStatus: string | null;
  currencyCode: string | null;
  balance: number | null;
}

// ---------------------------------------------------------------------------------------------------
// Customer edit requests (CustomerEditRequestsController / Contracts/{Requests,Responses}/*)
// ---------------------------------------------------------------------------------------------------

export interface CreateCustomerEditRequestRequest {
  targetCustomerId: string;
  proposedFullName: string | null;
  proposedEmail: string | null;
  proposedPhoneNumber: string | null;
}

export type OpsCustomerEditRequestStatus =
  | "PendingApproval"
  | "Approved"
  | "Rejected"
  | "Applied"
  | "ApplicationFailed"
  | "Expired";

export interface CustomerEditRequestResponse {
  id: string;
  targetCustomerId: string;
  proposedFullName: string | null;
  proposedEmail: string | null;
  proposedPhoneNumber: string | null;
  requestedByStaffId: string;
  status: OpsCustomerEditRequestStatus;
  approvedByStaffId: string | null;
  rejectionReason: string | null;
  requestedAt: string;
  decidedAt: string | null;
  applicationError: string | null;
}

// ---------------------------------------------------------------------------------------------------
// Reversal requests (ReversalRequestsController / Contracts/{Requests,Responses}/*,
// Validation/ReversalReasonCodes.cs)
// ---------------------------------------------------------------------------------------------------

export const REVERSAL_REASON_CODES = ["DUPL", "TECH", "FRAD", "CUST", "UNAUTH"] as const;
export type ReversalReasonCode = (typeof REVERSAL_REASON_CODES)[number];

export interface CreateReversalRequestRequest {
  idempotencyKey: string;
  originalTransactionReference: string;
  amount: number;
  currency: string;
  reasonCode: ReversalReasonCode;
}

export type OpsReversalRequestStatus =
  | "PendingApproval"
  | "Approved"
  | "Rejected"
  | "Executed"
  | "ExecutionFailed"
  | "Expired";

export interface ReversalRequestResponse {
  id: string;
  originalTransactionReference: string;
  amount: number;
  currency: string;
  reasonCode: string;
  requestedByStaffId: string;
  status: OpsReversalRequestStatus;
  approvedByStaffId: string | null;
  rejectionReason: string | null;
  requestedAt: string;
  decidedAt: string | null;
  executedReference: string | null;
  executionDetail: string | null;
}

// Shared by both maker-checker workflows (Contracts/Requests/RejectRequest.cs).
export interface RejectRequest {
  rejectionReason: string;
}

// ---------------------------------------------------------------------------------------------------
// Testing console (TestingConsoleController / Contracts/{Requests,Responses}/*)
// ---------------------------------------------------------------------------------------------------

export interface StartAccountOpeningRequest {
  idempotencyKey: string;
  fullName: string;
  jurisdictionCode: string;
  customerReference: string | null;
  email: string | null;
  phoneNumber: string | null;
  accountName: string;
  accountType: string;
  currencyCode: string;
}

export interface AccountOpeningResponse {
  id: string;
  status: string;
  currentStep: string;
  customerId: string | null;
  ledgerAccountId: string | null;
  failureReason: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface TransferRequest {
  idempotencyKey: string;
  requestedBy: string;
  debitAccountId: string;
  creditAccountId: string;
  amount: number;
  currency: string;
  narration: string | null;
}

export interface TransferResultResponse {
  decisionId: string;
  reference: string;
  status: string;
  failureReason: string | null;
}

export interface FundingRequest {
  customerAccountNumber: string;
  amount: number;
  narration: string | null;
  idempotencyKey: string;
}

export interface FundingResultResponse {
  reference: string;
  status: string;
  failureReason: string | null;
}

// ---------------------------------------------------------------------------------------------------
// Staff & role management (StaffManagementController - thin pass-through to StaffIdentityApi's own
// response shapes, Clients/Contracts/StaffIdentity/*.cs)
// ---------------------------------------------------------------------------------------------------

export interface CreateStaffRequest {
  fullName: string;
  username: string;
  role: OpsRole;
}

export interface StaffResponse {
  staffId: string;
  fullName: string;
  username: string;
  role: OpsRole;
  status: "Active" | "Suspended" | "Terminated";
  mustChangePassword: boolean;
  supervisorStaffId: string | null;
  createdAt: string;
  createdByStaffId: string | null;
  updatedAt: string;
}

export interface CreateStaffResponse {
  staff: StaffResponse;
  temporaryPassword: string | null;
}

export interface StaffListResponse {
  items: StaffResponse[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface ChangeRoleRequest {
  role: OpsRole;
}

export interface ChangeStatusRequest {
  status: "Active" | "Suspended" | "Terminated";
}

export interface ChangeSupervisorRequest {
  supervisorStaffId: string | null;
}

export interface ChangePasswordResponse {
  staffId: string;
  temporaryPassword: string | null;
}

// ---------------------------------------------------------------------------------------------------
// Joint-account approval test console (JointApprovalConsoleController / Clients/Contracts/Identity/*.cs)
// - a thin pass-through to IdentityApi's own queue/approve shapes, DESIGN.md Section 6 item 6: a
// stand-in for a real customer channel that doesn't exist yet, not a real customer-facing flow.
// ---------------------------------------------------------------------------------------------------

export interface PagedResponse<T> {
  items: T[];
  nextPageToken: string | null;
}

export interface PendingApprovalRequestResponse {
  requestId: string;
  kind: string;
  status: string;
  ledgerAccountId: string;
  requestedBy: string;
  operation: string | null;
  debitAccountId: string | null;
  creditAccountId: string | null;
  amount: string | null;
  currency: string | null;
  requestedRequiredApprovals: number | null;
  requiredApprovals: number;
  approvalCount: number;
  createdAt: string;
  expiresAt: string;
  decisionId: string | null;
  grant: string | null;
}

export interface ApproveJointRequestRequest {
  customerId: string;
}
