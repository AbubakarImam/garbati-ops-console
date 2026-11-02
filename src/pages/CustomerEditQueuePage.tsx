import { useState } from "react";
import { Button, Input, Modal, Space, Table, Tag, Typography } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customerEditsApi } from "../api/endpoints";
import { ApiErrorAlert } from "../components/ApiErrorAlert";
import { useAuth } from "../auth/AuthContext";
import { ROLE_MATRIX, roleCan } from "../auth/roles";
import type { CustomerEditRequestResponse } from "../api/types";

// CustomerEditRequestsController, DESIGN.md Section 4.1: GET /v1/ops/customer-edits (+/{id}),
// POST .../{id}/approve, POST .../{id}/reject. Supervisor (checker). This app's NAV only shows this
// screen to Supervisor (src/auth/roles.ts) - but DESIGN.md Section 5 is explicit that nav hiding is UX,
// not security, and the backend's own class-level gate on this controller also admits
// CustomerServiceOfficer (so they can list/get their OWN staged requests). A CustomerServiceOfficer who
// reaches this screen by direct URL must not see clickable Approve/Reject buttons that would only ever
// come back a real 403 - gated here the same way ReversalQueuePage/JointApprovalConsolePage already
// gate their own action buttons, not left to the backend's rejection alone to communicate "you can't do
// this." A Supervisor acting on their own staged request is still a real possibility OpsApi itself does
// not forbid (DESIGN.md 4.1's own decision #3: "any Supervisor may approve, not strictly the requester's
// own named SupervisorStaffId").
export function CustomerEditQueuePage() {
  const { user } = useAuth();
  const canAct = roleCan(user?.role, ROLE_MATRIX.decideCustomerEdit);
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["customer-edits"],
    queryFn: customerEditsApi.list,
  });

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const approveMutation = useMutation({
    mutationFn: (id: string) => customerEditsApi.approve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customer-edits"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      customerEditsApi.reject(id, { rejectionReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-edits"] });
      setRejectingId(null);
      setRejectionReason("");
    },
  });

  const columns = [
    { title: "ID", dataIndex: "id", key: "id" },
    { title: "Target customer", dataIndex: "targetCustomerId", key: "targetCustomerId" },
    {
      title: "Proposed changes",
      key: "proposed",
      render: (_: unknown, row: CustomerEditRequestResponse) => (
        <Space direction="vertical" size={0}>
          {row.proposedFullName && <span>Name: {row.proposedFullName}</span>}
          {row.proposedEmail && <span>Email: {row.proposedEmail}</span>}
          {row.proposedPhoneNumber && <span>Phone: {row.proposedPhoneNumber}</span>}
        </Space>
      ),
    },
    { title: "Requested by", dataIndex: "requestedByStaffId", key: "requestedByStaffId" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => <Tag>{status}</Tag>,
    },
    ...(canAct
      ? [
          {
            title: "Actions",
            key: "actions",
            render: (_: unknown, row: CustomerEditRequestResponse) =>
              row.status === "PendingApproval" ? (
                <Space>
                  <Button size="small" type="primary" loading={approveMutation.isPending} onClick={() => approveMutation.mutate(row.id)}>
                    Approve
                  </Button>
                  <Button size="small" danger onClick={() => setRejectingId(row.id)}>
                    Reject
                  </Button>
                </Space>
              ) : (
                <span style={{ color: "#999" }}>Decided</span>
              ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <Typography.Title level={3}>Customer edit approvals</Typography.Title>
      {error && <ApiErrorAlert error={error} />}
      {approveMutation.isError && <ApiErrorAlert error={approveMutation.error} />}
      <Table
        rowKey="id"
        loading={isLoading}
        columns={columns}
        dataSource={data ?? []}
        pagination={false}
      />
      {canAct && (
        <Modal
          title="Reject customer edit request"
          open={rejectingId !== null}
          onCancel={() => setRejectingId(null)}
          onOk={() => rejectingId && rejectMutation.mutate({ id: rejectingId, reason: rejectionReason })}
          okButtonProps={{ disabled: !rejectionReason.trim(), loading: rejectMutation.isPending }}
        >
          {rejectMutation.isError && <ApiErrorAlert error={rejectMutation.error} />}
          <Input.TextArea
            rows={3}
            placeholder="Rejection reason (required)"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
        </Modal>
      )}
    </div>
  );
}
