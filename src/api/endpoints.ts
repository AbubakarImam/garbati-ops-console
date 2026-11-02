// One function per real OpsApi route, grouped by controller (task file: "each calling exactly the real
// OpsApi controller/route group it maps to"). Every function goes through apiGet/apiPost/apiPatch
// (src/api/client.ts), so every call in this app shares the same 401 handling.
import { apiGet, apiPatch, apiPost } from "./client";
import type {
  AccountOpeningResponse,
  ApproveJointRequestRequest,
  ChangeRoleRequest,
  ChangeStatusRequest,
  ChangeSupervisorRequest,
  ChangePasswordResponse,
  CreateCustomerEditRequestRequest,
  CreateReversalRequestRequest,
  CreateStaffRequest,
  CreateStaffResponse,
  CustomerEditRequestResponse,
  CustomerLookupResponse,
  FundingRequest,
  FundingResultResponse,
  LoginRequest,
  MeResponse,
  PagedResponse,
  PendingApprovalRequestResponse,
  RejectRequest,
  ReversalRequestResponse,
  StaffListResponse,
  StaffResponse,
  StartAccountOpeningRequest,
  TransferRequest,
  TransferResultResponse,
} from "./types";

// --- SessionController (DESIGN.md Section 4 / 2.1a) ---------------------------------------------------
export const sessionApi = {
  login: (request: LoginRequest) => apiPost<MeResponse>("/v1/ops/login", request),
  me: () => apiGet<MeResponse>("/v1/ops/me"),
  logout: () => apiPost<void>("/v1/ops/logout"),
};

// --- CustomerLookupController (Section 6 item 1) ------------------------------------------------------
export const customerLookupApi = {
  lookup: (customerId: string, accountNumber?: string) => {
    const query = accountNumber ? `?accountNumber=${encodeURIComponent(accountNumber)}` : "";
    return apiGet<CustomerLookupResponse>(`/v1/ops/customers/${encodeURIComponent(customerId)}${query}`);
  },
};

// --- CustomerEditRequestsController (Section 4.1) ------------------------------------------------------
export const customerEditsApi = {
  create: (request: CreateCustomerEditRequestRequest) =>
    apiPost<CustomerEditRequestResponse>("/v1/ops/customer-edits", request),
  list: () => apiGet<CustomerEditRequestResponse[]>("/v1/ops/customer-edits"),
  get: (id: string) => apiGet<CustomerEditRequestResponse>(`/v1/ops/customer-edits/${encodeURIComponent(id)}`),
  approve: (id: string) => apiPost<CustomerEditRequestResponse>(`/v1/ops/customer-edits/${encodeURIComponent(id)}/approve`),
  reject: (id: string, request: RejectRequest) =>
    apiPost<CustomerEditRequestResponse>(`/v1/ops/customer-edits/${encodeURIComponent(id)}/reject`, request),
};

// --- ReversalRequestsController (Section 5) ------------------------------------------------------------
export const reversalsApi = {
  create: (request: CreateReversalRequestRequest) => apiPost<ReversalRequestResponse>("/v1/ops/reversals", request),
  list: () => apiGet<ReversalRequestResponse[]>("/v1/ops/reversals"),
  get: (id: string) => apiGet<ReversalRequestResponse>(`/v1/ops/reversals/${encodeURIComponent(id)}`),
  approve: (id: string) => apiPost<ReversalRequestResponse>(`/v1/ops/reversals/${encodeURIComponent(id)}/approve`),
  reject: (id: string, request: RejectRequest) =>
    apiPost<ReversalRequestResponse>(`/v1/ops/reversals/${encodeURIComponent(id)}/reject`, request),
};

// --- TestingConsoleController (Section 6 item 4) --------------------------------------------------------
export const testingConsoleApi = {
  startAccountOpening: (request: StartAccountOpeningRequest) =>
    apiPost<AccountOpeningResponse>("/v1/ops/console/account-openings", request),
  transfer: (request: TransferRequest) => apiPost<TransferResultResponse>("/v1/ops/console/transfers", request),
  fund: (request: FundingRequest) => apiPost<FundingResultResponse>("/v1/ops/console/funding", request),
};

// --- StaffManagementController (Section 6 item 5) -------------------------------------------------------
export const staffApi = {
  create: (request: CreateStaffRequest) => apiPost<CreateStaffResponse>("/v1/ops/staff", request),
  get: (staffId: string) => apiGet<StaffResponse>(`/v1/ops/staff/${encodeURIComponent(staffId)}`),
  list: (supervisorStaffId?: string, page = 1, pageSize = 20) => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (supervisorStaffId) {
      params.set("supervisorStaffId", supervisorStaffId);
    }
    return apiGet<StaffListResponse>(`/v1/ops/staff?${params.toString()}`);
  },
  changeRole: (staffId: string, request: ChangeRoleRequest) =>
    apiPatch<StaffResponse>(`/v1/ops/staff/${encodeURIComponent(staffId)}/role`, request),
  changeStatus: (staffId: string, request: ChangeStatusRequest) =>
    apiPatch<StaffResponse>(`/v1/ops/staff/${encodeURIComponent(staffId)}/status`, request),
  changeSupervisor: (staffId: string, request: ChangeSupervisorRequest) =>
    apiPatch<StaffResponse>(`/v1/ops/staff/${encodeURIComponent(staffId)}/supervisor`, request),
  resetPassword: (staffId: string) =>
    apiPost<ChangePasswordResponse>(`/v1/ops/staff/${encodeURIComponent(staffId)}/password`),
};

// --- JointApprovalConsoleController (Section 6 item 6) ----------------------------------------------------
// DESIGN.md Section 2's own framing: "labeled in-UI as a stand-in for a real customer channel that
// doesn't exist yet" - see src/pages/JointApprovalConsolePage.tsx's banner.
export const jointApprovalsApi = {
  listPending: (pageSize = 20, pageToken?: string) => {
    const params = new URLSearchParams({ pageSize: String(pageSize) });
    if (pageToken) {
      params.set("pageToken", pageToken);
    }
    return apiGet<PagedResponse<PendingApprovalRequestResponse>>(`/v1/ops/joint-approvals?${params.toString()}`);
  },
  get: (requestId: string) =>
    apiGet<PendingApprovalRequestResponse>(`/v1/ops/joint-approvals/${encodeURIComponent(requestId)}`),
  approve: (requestId: string, request: ApproveJointRequestRequest) =>
    apiPost<PendingApprovalRequestResponse>(`/v1/ops/joint-approvals/${encodeURIComponent(requestId)}/approve`, request),
};
