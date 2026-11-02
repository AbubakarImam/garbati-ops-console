import { useState } from "react";
import { Alert, Button, Input, Modal, Space, Table, Tag, Typography } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jointApprovalsApi } from "../api/endpoints";
import { ApiErrorAlert } from "../components/ApiErrorAlert";
import { useAuth } from "../auth/AuthContext";
import { ROLE_MATRIX, roleCan } from "../auth/roles";
import type { PendingApprovalRequestResponse } from "../api/types";

// JointApprovalConsoleController, DESIGN.md Section 6 item 6: GET /v1/ops/joint-approvals (+/{id}),
// POST .../{id}/approve. Supervisor acts, Auditor read-only - enforced server-side per action
// (JointApprovalConsoleController's own Approve carries a narrower [Authorize] than its class-level
// gate, replacing it, same as ReversalRequestsController).
//
// Task file / DESIGN.md Section 2's own framing, repeated here deliberately: this is a stand-in for a
// real customer channel that doesn't exist yet. A real customer would approve their own joint-account
// mandate action themselves, from their own device - this screen lets ops staff do it instead, purely
// for demo/QA purposes, and must never be mistaken for a real customer-facing flow.
export function JointApprovalConsolePage() {
  const { user } = useAuth();
  const canAct = roleCan(user?.role, ROLE_MATRIX.decideJointApproval);
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["joint-approvals"],
    queryFn: () => jointApprovalsApi.listPending(),
  });

  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState("");

  const approveMutation = useMutation({
    mutationFn: ({ requestId, customerId }: { requestId: string; customerId: string }) =>
      jointApprovalsApi.approve(requestId, { customerId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["joint-approvals"] });
      setApprovingRequestId(null);
      setCustomerId("");
    },
  });

  const columns = [
    { title: "Request ID", dataIndex: "requestId", key: "requestId" },
    { title: "Kind", dataIndex: "kind", key: "kind" },
    { title: "Status", dataIndex: "status", key: "status", render: (s: string) => <Tag>{s}</Tag> },
    { title: "Ledger account", dataIndex: "ledgerAccountId", key: "ledgerAccountId" },
    { title: "Requested by", dataIndex: "requestedBy", key: "requestedBy" },
    { title: "Operation", dataIndex: "operation", key: "operation", render: (v: string | null) => v ?? "—" },
    {
      title: "Amount",
      key: "amount",
      render: (_: unknown, row: PendingApprovalRequestResponse) => (row.amount ? `${row.amount} ${row.currency ?? ""}` : "—"),
    },
    { title: "Approvals", key: "approvals", render: (_: unknown, row: PendingApprovalRequestResponse) => `${row.approvalCount}/${row.requiredApprovals}` },
    { title: "Expires at", dataIndex: "expiresAt", key: "expiresAt" },
    ...(canAct
      ? [
          {
            title: "Actions",
            key: "actions",
            render: (_: unknown, row: PendingApprovalRequestResponse) => (
              <Button size="small" type="primary" onClick={() => setApprovingRequestId(row.requestId)}>
                Approve
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <div>
      <Typography.Title level={3}>Joint-account approval (test console)</Typography.Title>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Not a real customer channel"
        description="A real joint-account holder would approve from their own device. This screen lets ops staff drive the same approval endpoint for demo/QA purposes only."
      />
      {error && <ApiErrorAlert error={error} />}
      <Table rowKey="requestId" loading={isLoading} columns={columns} dataSource={data?.items ?? []} pagination={false} />
      {canAct && (
        <Modal
          title="Approve joint-account request"
          open={approvingRequestId !== null}
          onCancel={() => setApprovingRequestId(null)}
          onOk={() => approvingRequestId && approveMutation.mutate({ requestId: approvingRequestId, customerId })}
          okButtonProps={{ disabled: !customerId.trim(), loading: approveMutation.isPending }}
        >
          {approveMutation.isError && <ApiErrorAlert error={approveMutation.error} />}
          <Space direction="vertical" style={{ width: "100%" }}>
            <Typography.Text>Customer ID (the account holder approving this request)</Typography.Text>
            <Input value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="CUST-..." />
          </Space>
        </Modal>
      )}
    </div>
  );
}
