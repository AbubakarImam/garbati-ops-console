import { useState } from "react";
import { Alert, Button, Card, Form, Input, InputNumber, Select, Typography } from "antd";
import { useMutation } from "@tanstack/react-query";
import { reversalsApi } from "../api/endpoints";
import { ApiErrorAlert } from "../components/ApiErrorAlert";
import { REVERSAL_REASON_CODES, type ReversalReasonCode } from "../api/types";

function newIdempotencyKey(): string {
  return `ops-console:${crypto.randomUUID()}`;
}

// ReversalRequestsController.Create, DESIGN.md Section 5: POST /v1/ops/reversals. Teller,
// CustomerServiceOfficer. IdempotencyKey is client-supplied and kept stable across a retry of the SAME
// submission attempt (Contracts/Requests/CreateReversalRequestRequest.cs's own comment: "the browser
// generates one id per logical attempt and resends the same value on a retry of that same attempt") -
// only regenerated once a request actually succeeds, so clicking "submit" again after a failure is a
// safe retry, not a brand-new request.
export function ReversalCreatePage() {
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [originalTransactionReference, setOriginalTransactionReference] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [currency, setCurrency] = useState("");
  const [reasonCode, setReasonCode] = useState<ReversalReasonCode | undefined>(undefined);

  const mutation = useMutation({
    mutationFn: () =>
      reversalsApi.create({
        idempotencyKey,
        originalTransactionReference: originalTransactionReference.trim(),
        amount: amount!,
        currency: currency.trim().toUpperCase(),
        reasonCode: reasonCode!,
      }),
    onSuccess: () => setIdempotencyKey(newIdempotencyKey()),
  });

  const canSubmit = Boolean(
    originalTransactionReference.trim() && amount && amount > 0 && currency.trim().length === 3 && reasonCode,
  );

  return (
    <div>
      <Typography.Title level={3}>Request a reversal</Typography.Title>
      <Card style={{ maxWidth: 480 }}>
        <Form layout="vertical" onFinish={() => mutation.mutate()}>
          {mutation.isError && (
            <div style={{ marginBottom: 16 }}>
              <ApiErrorAlert error={mutation.error} />
            </div>
          )}
          {mutation.isSuccess && (
            <Alert
              type="success"
              showIcon
              message={`Request ${mutation.data.id} created (status: ${mutation.data.status}) - awaiting a Supervisor's decision.`}
              style={{ marginBottom: 16 }}
            />
          )}
          <Form.Item label="Original transaction reference" required>
            <Input
              value={originalTransactionReference}
              onChange={(e) => setOriginalTransactionReference(e.target.value)}
              placeholder="TXN-..."
            />
          </Form.Item>
          <Form.Item label="Amount" required>
            <InputNumber style={{ width: "100%" }} min={0.01} value={amount ?? undefined} onChange={(v) => setAmount(v)} />
          </Form.Item>
          <Form.Item label="Currency (3-letter code)" required>
            <Input value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={3} />
          </Form.Item>
          <Form.Item label="Reason code" required>
            <Select
              value={reasonCode}
              onChange={setReasonCode}
              options={REVERSAL_REASON_CODES.map((code) => ({ value: code, label: code }))}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={mutation.isPending} disabled={!canSubmit}>
            Submit reversal request
          </Button>
        </Form>
      </Card>
    </div>
  );
}
