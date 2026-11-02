import { useState } from "react";
import { Alert, Button, Card, Form, Input, InputNumber, Tabs, Typography } from "antd";
import { useMutation } from "@tanstack/react-query";
import { testingConsoleApi } from "../api/endpoints";
import { ApiErrorAlert } from "../components/ApiErrorAlert";

function newIdempotencyKey(): string {
  return `ops-console:${crypto.randomUUID()}`;
}

// TestingConsoleController, DESIGN.md Section 6 item 4: POST /v1/ops/console/{account-openings,
// transfers,funding}. Teller, Supervisor. Every action here is a real call against OrchestratorApi (the
// first two) or LedgerApi directly (funding, 3.4) - this is a staff testing/demo tool, not a simulation.

function AccountOpeningForm() {
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [fullName, setFullName] = useState("");
  const [jurisdictionCode, setJurisdictionCode] = useState("");
  const [customerReference, setCustomerReference] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      testingConsoleApi.startAccountOpening({
        idempotencyKey,
        fullName: fullName.trim(),
        jurisdictionCode: jurisdictionCode.trim(),
        customerReference: customerReference.trim() || null,
        email: email.trim() || null,
        phoneNumber: phoneNumber.trim() || null,
        accountName: accountName.trim(),
        accountType: accountType.trim(),
        currencyCode: currencyCode.trim().toUpperCase(),
      }),
    onSuccess: () => setIdempotencyKey(newIdempotencyKey()),
  });

  const canSubmit = Boolean(
    fullName.trim() && jurisdictionCode.trim() && accountName.trim() && accountType.trim() && currencyCode.trim(),
  );

  return (
    <Form layout="vertical" onFinish={() => mutation.mutate()} style={{ maxWidth: 480 }}>
      {mutation.isError && <ApiErrorAlert error={mutation.error} />}
      {mutation.isSuccess && (
        <Alert
          type={mutation.data.status === "Failed" ? "warning" : "success"}
          showIcon
          message={`${mutation.data.id}: ${mutation.data.status} (step: ${mutation.data.currentStep})`}
          description={mutation.data.failureReason ?? undefined}
          style={{ marginBottom: 16 }}
        />
      )}
      <Form.Item label="Full name" required>
        <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </Form.Item>
      <Form.Item label="Jurisdiction code" required>
        <Input value={jurisdictionCode} onChange={(e) => setJurisdictionCode(e.target.value)} />
      </Form.Item>
      <Form.Item label="Customer reference">
        <Input value={customerReference} onChange={(e) => setCustomerReference(e.target.value)} />
      </Form.Item>
      <Form.Item label="Email">
        <Input value={email} onChange={(e) => setEmail(e.target.value)} />
      </Form.Item>
      <Form.Item label="Phone number">
        <Input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
      </Form.Item>
      <Form.Item label="Account name" required>
        <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} />
      </Form.Item>
      <Form.Item label="Account type" required>
        <Input value={accountType} onChange={(e) => setAccountType(e.target.value)} />
      </Form.Item>
      <Form.Item label="Currency code" required>
        <Input value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} maxLength={3} />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={mutation.isPending} disabled={!canSubmit}>
        Start account opening
      </Button>
    </Form>
  );
}

function TransferForm() {
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [requestedBy, setRequestedBy] = useState("");
  const [debitAccountId, setDebitAccountId] = useState("");
  const [creditAccountId, setCreditAccountId] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [currency, setCurrency] = useState("");
  const [narration, setNarration] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      testingConsoleApi.transfer({
        idempotencyKey,
        requestedBy: requestedBy.trim(),
        debitAccountId: debitAccountId.trim(),
        creditAccountId: creditAccountId.trim(),
        amount: amount!,
        currency: currency.trim().toUpperCase(),
        narration: narration.trim() || null,
      }),
    onSuccess: () => setIdempotencyKey(newIdempotencyKey()),
  });

  const canSubmit = Boolean(
    requestedBy.trim() && debitAccountId.trim() && creditAccountId.trim() && amount && amount > 0 && currency.trim().length === 3,
  );

  return (
    <Form layout="vertical" onFinish={() => mutation.mutate()} style={{ maxWidth: 480 }}>
      {mutation.isError && <ApiErrorAlert error={mutation.error} />}
      {mutation.isSuccess && (
        <Alert
          type={mutation.data.status === "Failed" ? "warning" : "success"}
          showIcon
          message={`${mutation.data.reference}: ${mutation.data.status}`}
          description={mutation.data.failureReason ?? undefined}
          style={{ marginBottom: 16 }}
        />
      )}
      <Form.Item label="Requested by (customer ID)" required>
        <Input value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} />
      </Form.Item>
      <Form.Item label="Debit account ID" required>
        <Input value={debitAccountId} onChange={(e) => setDebitAccountId(e.target.value)} />
      </Form.Item>
      <Form.Item label="Credit account ID" required>
        <Input value={creditAccountId} onChange={(e) => setCreditAccountId(e.target.value)} />
      </Form.Item>
      <Form.Item label="Amount" required>
        <InputNumber style={{ width: "100%" }} min={0.01} value={amount ?? undefined} onChange={setAmount} />
      </Form.Item>
      <Form.Item label="Currency" required>
        <Input value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={3} />
      </Form.Item>
      <Form.Item label="Narration">
        <Input value={narration} onChange={(e) => setNarration(e.target.value)} />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={mutation.isPending} disabled={!canSubmit}>
        Transfer
      </Button>
    </Form>
  );
}

function FundingForm() {
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const [customerAccountNumber, setCustomerAccountNumber] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [narration, setNarration] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      testingConsoleApi.fund({
        customerAccountNumber: customerAccountNumber.trim(),
        amount: amount!,
        narration: narration.trim() || null,
        idempotencyKey,
      }),
    onSuccess: () => setIdempotencyKey(newIdempotencyKey()),
  });

  const canSubmit = Boolean(customerAccountNumber.trim() && amount && amount > 0);

  return (
    <Form layout="vertical" onFinish={() => mutation.mutate()} style={{ maxWidth: 480 }}>
      {mutation.isError && <ApiErrorAlert error={mutation.error} />}
      {mutation.isSuccess && (
        <Alert
          type={mutation.data.status === "Failed" ? "warning" : "success"}
          showIcon
          message={`${mutation.data.reference}: ${mutation.data.status}`}
          description={mutation.data.failureReason ?? undefined}
          style={{ marginBottom: 16 }}
        />
      )}
      <Form.Item label="Customer account number" required>
        <Input value={customerAccountNumber} onChange={(e) => setCustomerAccountNumber(e.target.value)} />
      </Form.Item>
      <Form.Item label="Amount" required>
        <InputNumber style={{ width: "100%" }} min={0.01} value={amount ?? undefined} onChange={setAmount} />
      </Form.Item>
      <Form.Item label="Narration">
        <Input value={narration} onChange={(e) => setNarration(e.target.value)} />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={mutation.isPending} disabled={!canSubmit}>
        Fund
      </Button>
    </Form>
  );
}

export function TestingConsolePage() {
  return (
    <div>
      <Typography.Title level={3}>Transfer/transaction testing console</Typography.Title>
      <Card>
        <Tabs
          items={[
            { key: "account-opening", label: "Account opening", children: <AccountOpeningForm /> },
            { key: "transfer", label: "Transfer", children: <TransferForm /> },
            { key: "funding", label: "Funding", children: <FundingForm /> },
          ]}
        />
      </Card>
    </div>
  );
}
