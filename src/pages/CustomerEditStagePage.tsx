import { useState } from "react";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { useMutation } from "@tanstack/react-query";
import { customerEditsApi } from "../api/endpoints";
import { ApiErrorAlert } from "../components/ApiErrorAlert";

// CustomerEditRequestsController.Create, DESIGN.md Section 4.1: POST /v1/ops/customer-edits.
// CustomerServiceOfficer (maker) - staged, not applied immediately; a Supervisor decides it
// (CustomerEditQueuePage).
export function CustomerEditStagePage() {
  const [targetCustomerId, setTargetCustomerId] = useState("");
  const [proposedFullName, setProposedFullName] = useState("");
  const [proposedEmail, setProposedEmail] = useState("");
  const [proposedPhoneNumber, setProposedPhoneNumber] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      customerEditsApi.create({
        targetCustomerId: targetCustomerId.trim(),
        proposedFullName: proposedFullName.trim() || null,
        proposedEmail: proposedEmail.trim() || null,
        proposedPhoneNumber: proposedPhoneNumber.trim() || null,
      }),
  });

  const atLeastOneProposed = Boolean(
    proposedFullName.trim() || proposedEmail.trim() || proposedPhoneNumber.trim(),
  );

  return (
    <div>
      <Typography.Title level={3}>Stage a customer detail edit</Typography.Title>
      <Card style={{ maxWidth: 480 }}>
        <Form
          layout="vertical"
          onFinish={() => mutation.mutate()}
          onFinishFailed={() => undefined}
        >
          {mutation.isError && (
            <div style={{ marginBottom: 16 }}>
              <ApiErrorAlert error={mutation.error} />
            </div>
          )}
          {mutation.isSuccess && (
            <Alert
              type="success"
              showIcon
              message={`Staged as ${mutation.data.id} (status: ${mutation.data.status}) - a Supervisor still needs to approve it.`}
              style={{ marginBottom: 16 }}
            />
          )}
          <Form.Item label="Target customer ID" required>
            <Input value={targetCustomerId} onChange={(e) => setTargetCustomerId(e.target.value)} />
          </Form.Item>
          <Form.Item label="Proposed full name">
            <Input value={proposedFullName} onChange={(e) => setProposedFullName(e.target.value)} />
          </Form.Item>
          <Form.Item label="Proposed email">
            <Input value={proposedEmail} onChange={(e) => setProposedEmail(e.target.value)} />
          </Form.Item>
          <Form.Item label="Proposed phone number">
            <Input value={proposedPhoneNumber} onChange={(e) => setProposedPhoneNumber(e.target.value)} />
          </Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            loading={mutation.isPending}
            disabled={!targetCustomerId.trim() || !atLeastOneProposed}
          >
            Stage edit
          </Button>
        </Form>
      </Card>
    </div>
  );
}
