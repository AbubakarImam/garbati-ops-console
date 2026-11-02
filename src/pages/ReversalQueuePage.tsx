import { useState } from "react";
import { Alert, Button, Input, Modal, Space, Table, Tag, Typography } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { reversalsApi } from "../api/endpoints";
import { ApiErrorAlert } from "../components/ApiErrorAlert";
import { useAuth } from "../auth/AuthContext";
import { ROLE_MATRIX, roleCan } from "../auth/roles";
import type { ReversalRequestResponse } from "../api/types";

// ReversalRequestsController, DESIGN.md Section 5: GET /v1/ops/reversals (+/{id}), POST .../{id}/approve,
// POST .../{id}/reject. Supervisor acts; ComplianceOfficer/RiskOfficer/Auditor see the same list
// read-only (Section 2's own framing: "the allowed actions differ by role on the same data" - this app
// renders ONE screen for both, gating only the buttons on `user.role`, same as OpsApi's own
// action-level [Authorize(Roles = Supervisor)] on Approve/Reject replacing its wider class-level gate).
export function ReversalQueuePage() {
  const { user } = useAuth();
  const canAct = roleCan(user?.role, ROLE_MATRIX.decideReversal);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["reversals"],
    queryFn: reversalsApi.list,
  });

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const approveMutation = useMutation({
    mutationFn: (id: string) => reversalsApi.approve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["reversals"] }),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => reversalsApi.reject(id, { rejectionReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reversals"] });
      setRejectingId(null);
      setRejectionReason("");
    },
  });

  const columns = [
    { title: "ID", dataIndex: "id", key: "id" },
    { title: "Original txn", dataIndex: "originalTransactionReference", key: "originalTransactionReference" },
    { title: "Amount", key: "amount", render: (_: unknown, row: ReversalRequestResponse) => `${row.amount} ${row.currency}` },
    { title: "Reason", dataIndex: "reasonCode", key: "reasonCode" },
    { title: "Requested by", dataIndex: "requestedByStaffId", key: "requestedByStaffId" },
    { title: "Status", dataIndex: "status", key: "status", render: (status: string) => <Tag>{status}</Tag> },
    { title: "Execution detail", dataIndex: "executionDetail", key: "executionDetail", render: (v: string | null) => v ?? "—" },
    ...(canAct
      ? [
          {
            title: "Actions",
            key: "actions",
            render: (_: unknown, row: ReversalRequestResponse) =>
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
      <Typography.Title level={3}>Reversal requests {canAct ? "— approve/reject" : "— read-only oversight"}</Typography.Title>
      {error && <ApiErrorAlert error={error} />}
      {approveMutation.isError && <ApiErrorAlert error={approveMutation.error} />}
      {approveMutation.isSuccess && approveMutation.data.status === "ExecutionFailed" && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Approved, but execution failed downstream"
          description={approveMutation.data.executionDetail ?? "OrchestratorApi reported a failure. See the table's Execution detail column."}
        />
      )}
      <Table rowKey="id" loading={isLoading} columns={columns} dataSource={data ?? []} pagination={false} />
      {canAct && (
        <Modal
          title="Reject reversal request"
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
