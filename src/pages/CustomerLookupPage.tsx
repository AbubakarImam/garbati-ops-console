import { useState } from "react";
import { Button, Card, Descriptions, Form, Input, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { customerLookupApi } from "../api/endpoints";
import { ApiErrorAlert } from "../components/ApiErrorAlert";

// CustomerLookupController, DESIGN.md Section 6 item 1 / Section 4: GET /v1/ops/customers/{customerId}.
// All seven roles.
export function CustomerLookupPage() {
  const [customerId, setCustomerId] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [submitted, setSubmitted] = useState<{ customerId: string; accountNumber: string } | null>(null);

  const { data, isFetching, error } = useQuery({
    queryKey: ["customer-lookup", submitted?.customerId, submitted?.accountNumber],
    queryFn: () => customerLookupApi.lookup(submitted!.customerId, submitted!.accountNumber || undefined),
    enabled: submitted !== null,
  });

  return (
    <div>
      <Typography.Title level={3}>Customer & account lookup</Typography.Title>
      <Card>
        <Form
          layout="inline"
          onFinish={() => setSubmitted({ customerId: customerId.trim(), accountNumber: accountNumber.trim() })}
        >
          <Form.Item label="Customer ID" required>
            <Input
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="CUST-..."
              style={{ width: 220 }}
            />
          </Form.Item>
          <Form.Item label="Account number (optional)">
            <Input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              style={{ width: 220 }}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={isFetching} disabled={!customerId.trim()}>
              Look up
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {error && (
        <div style={{ marginTop: 16 }}>
          <ApiErrorAlert error={error} />
        </div>
      )}

      {data && (
        <Card style={{ marginTop: 16 }} title="Result">
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Customer ID">{data.customerId}</Descriptions.Item>
            <Descriptions.Item label="Customer reference">{data.customerReference ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Customer status">{data.customerStatus}</Descriptions.Item>
            <Descriptions.Item label="KYC status">{data.kycStatus}</Descriptions.Item>
            <Descriptions.Item label="KYC tier">{data.kycTier ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Jurisdiction">{data.jurisdictionCode}</Descriptions.Item>
            <Descriptions.Item label="Account number">{data.accountNumber ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Account name">{data.accountName ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Account type">{data.accountType ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Account status">{data.accountStatus ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Currency">{data.currencyCode ?? "—"}</Descriptions.Item>
            <Descriptions.Item label="Balance">{data.balance ?? "—"}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}
    </div>
  );
}
