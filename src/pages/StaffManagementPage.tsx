import { useState } from "react";
import { Alert, Button, Card, Form, Input, Modal, Select, Space, Table, Tag, Typography } from "antd";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { staffApi } from "../api/endpoints";
import { ApiErrorAlert } from "../components/ApiErrorAlert";
import { ALL_ROLES } from "../auth/roles";
import type { StaffResponse } from "../api/types";

// StaffManagementController, DESIGN.md Section 6 item 5: thin pass-through to StaffIdentityApi's own
// endpoints. Administrator-only. PATCH role/status additionally trigger OpsApi's own cascade session
// revocation server-side (DESIGN.md Section 2.3) - nothing this screen needs to do itself.

const STATUS_OPTIONS = ["Active", "Suspended", "Terminated"] as const;

function CreateStaffForm({ onCreated }: { onCreated: () => void }) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState<string | undefined>(undefined);

  const mutation = useMutation({
    mutationFn: () => staffApi.create({ fullName: fullName.trim(), username: username.trim(), role: role as never }),
    onSuccess: () => {
      onCreated();
      setFullName("");
      setUsername("");
      setRole(undefined);
    },
  });

  return (
    <Form layout="inline" onFinish={() => mutation.mutate()} style={{ marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
      <Form.Item label="Full name">
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </Form.Item>
      <Form.Item label="Username">
        <Input value={username} onChange={(e) => setUsername(e.target.value)} />
      </Form.Item>
      <Form.Item label="Role">
        <Select
          style={{ width: 200 }}
          value={role}
          onChange={setRole}
          options={ALL_ROLES.map((r) => ({ value: r, label: r }))}
        />
      </Form.Item>
      <Form.Item>
        <Button type="primary" htmlType="submit" loading={mutation.isPending} disabled={!fullName.trim() || !username.trim() || !role}>
          Create staff
        </Button>
      </Form.Item>
      {mutation.isError && (
        <div style={{ width: "100%" }}>
          <ApiErrorAlert error={mutation.error} />
        </div>
      )}
      {mutation.isSuccess && (
        <div style={{ width: "100%" }}>
          <Alert
            type="success"
            showIcon
            message={`Created ${mutation.data.staff.staffId} (${mutation.data.staff.username})`}
            description={
              mutation.data.temporaryPassword
                ? `One-time temporary password: ${mutation.data.temporaryPassword} (shown once - note it down now)`
                : undefined
            }
          />
        </div>
      )}
    </Form>
  );
}

const DEFAULT_PAGE_SIZE = 20;

export function StaffManagementPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // StaffListResponse carries page/pageSize/totalCount precisely so the UI can page through more than
  // one screenful of staff - wired into AntD Table's own pagination prop below rather than fetching
  // page 1 only and silently hiding anything past it.
  const { data, isLoading, error } = useQuery({
    queryKey: ["staff", page, pageSize],
    queryFn: () => staffApi.list(undefined, page, pageSize),
  });

  const [editingStaff, setEditingStaff] = useState<StaffResponse | null>(null);
  const [draftRole, setDraftRole] = useState<string | undefined>(undefined);
  const [draftStatus, setDraftStatus] = useState<string | undefined>(undefined);
  const [draftSupervisorStaffId, setDraftSupervisorStaffId] = useState("");
  const [passwordResult, setPasswordResult] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["staff"] });

  const changeRoleMutation = useMutation({
    mutationFn: ({ staffId, role }: { staffId: string; role: string }) =>
      staffApi.changeRole(staffId, { role: role as never }),
    onSuccess: invalidate,
  });
  const changeStatusMutation = useMutation({
    mutationFn: ({ staffId, status }: { staffId: string; status: string }) =>
      staffApi.changeStatus(staffId, { status: status as never }),
    onSuccess: invalidate,
  });
  const changeSupervisorMutation = useMutation({
    mutationFn: ({ staffId, supervisorStaffId }: { staffId: string; supervisorStaffId: string | null }) =>
      staffApi.changeSupervisor(staffId, { supervisorStaffId }),
    onSuccess: invalidate,
  });
  const resetPasswordMutation = useMutation({
    mutationFn: (staffId: string) => staffApi.resetPassword(staffId),
    onSuccess: (response) => setPasswordResult(response.temporaryPassword),
  });

  function openEdit(staff: StaffResponse) {
    setEditingStaff(staff);
    setDraftRole(staff.role);
    setDraftStatus(staff.status);
    setDraftSupervisorStaffId(staff.supervisorStaffId ?? "");
    setPasswordResult(null);
  }

  const columns = [
    { title: "Staff ID", dataIndex: "staffId", key: "staffId" },
    { title: "Full name", dataIndex: "fullName", key: "fullName" },
    { title: "Username", dataIndex: "username", key: "username" },
    { title: "Role", dataIndex: "role", key: "role", render: (r: string) => <Tag>{r}</Tag> },
    { title: "Status", dataIndex: "status", key: "status" },
    { title: "Supervisor", dataIndex: "supervisorStaffId", key: "supervisorStaffId", render: (v: string | null) => v ?? "—" },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, row: StaffResponse) => <Button size="small" onClick={() => openEdit(row)}>Manage</Button>,
    },
  ];

  return (
    <div>
      <Typography.Title level={3}>Staff & role management</Typography.Title>
      <Card>
        <CreateStaffForm onCreated={invalidate} />
        {error && <ApiErrorAlert error={error} />}
        <Table
          rowKey="staffId"
          loading={isLoading}
          columns={columns}
          dataSource={data?.items ?? []}
          pagination={{
            current: page,
            pageSize,
            total: data?.totalCount ?? 0,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            },
          }}
        />
      </Card>

      <Modal
        title={editingStaff ? `Manage ${editingStaff.staffId}` : ""}
        open={editingStaff !== null}
        onCancel={() => setEditingStaff(null)}
        footer={null}
      >
        {editingStaff && (
          <Space direction="vertical" style={{ width: "100%" }} size="large">
            <div>
              <Typography.Text strong>Role</Typography.Text>
              <Space.Compact style={{ width: "100%", marginTop: 8 }}>
                <Select
                  style={{ width: "70%" }}
                  value={draftRole}
                  onChange={setDraftRole}
                  options={ALL_ROLES.map((r) => ({ value: r, label: r }))}
                />
                <Button
                  type="primary"
                  loading={changeRoleMutation.isPending}
                  disabled={!draftRole || draftRole === editingStaff.role}
                  onClick={() => draftRole && changeRoleMutation.mutate({ staffId: editingStaff.staffId, role: draftRole })}
                >
                  Save
                </Button>
              </Space.Compact>
              {changeRoleMutation.isError && <ApiErrorAlert error={changeRoleMutation.error} />}
            </div>

            <div>
              <Typography.Text strong>Status (role/status change revokes active sessions)</Typography.Text>
              <Space.Compact style={{ width: "100%", marginTop: 8 }}>
                <Select
                  style={{ width: "70%" }}
                  value={draftStatus}
                  onChange={setDraftStatus}
                  options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
                />
                <Button
                  type="primary"
                  loading={changeStatusMutation.isPending}
                  disabled={!draftStatus || draftStatus === editingStaff.status}
                  onClick={() => draftStatus && changeStatusMutation.mutate({ staffId: editingStaff.staffId, status: draftStatus })}
                >
                  Save
                </Button>
              </Space.Compact>
              {changeStatusMutation.isError && <ApiErrorAlert error={changeStatusMutation.error} />}
            </div>

            <div>
              <Typography.Text strong>Supervisor staff ID (blank clears it)</Typography.Text>
              <Space.Compact style={{ width: "100%", marginTop: 8 }}>
                <Input
                  style={{ width: "70%" }}
                  value={draftSupervisorStaffId}
                  onChange={(e) => setDraftSupervisorStaffId(e.target.value)}
                />
                <Button
                  type="primary"
                  loading={changeSupervisorMutation.isPending}
                  onClick={() =>
                    changeSupervisorMutation.mutate({
                      staffId: editingStaff.staffId,
                      supervisorStaffId: draftSupervisorStaffId.trim() || null,
                    })
                  }
                >
                  Save
                </Button>
              </Space.Compact>
              {changeSupervisorMutation.isError && <ApiErrorAlert error={changeSupervisorMutation.error} />}
            </div>

            <div>
              <Typography.Text strong>Password</Typography.Text>
              <div style={{ marginTop: 8 }}>
                <Button loading={resetPasswordMutation.isPending} onClick={() => resetPasswordMutation.mutate(editingStaff.staffId)}>
                  Reset to a new temporary password
                </Button>
              </div>
              {resetPasswordMutation.isError && <ApiErrorAlert error={resetPasswordMutation.error} />}
              {passwordResult && (
                <Alert
                  style={{ marginTop: 8 }}
                  type="success"
                  showIcon
                  message={`One-time temporary password: ${passwordResult} (shown once)`}
                />
              )}
            </div>
          </Space>
        )}
      </Modal>
    </div>
  );
}
