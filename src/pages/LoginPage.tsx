import { useState } from "react";
import { Alert, Button, Card, Form, Input, Typography } from "antd";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/client";

// SessionController, DESIGN.md Section 2.1/4 step 1: POST /v1/ops/login. Everyone, unauthenticated.
export function LoginPage() {
  const { user, isInitializing, login } = useAuth();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isInitializing && user) {
    const redirectTo = (location.state as { from?: string } | null)?.from ?? "/customers";
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setError(null);
    try {
      await login(username, password);
    } catch (err) {
      // SessionController.Login: "returns StaffIdentityApi's own generic 401 unchanged - no additional
      // information added or removed." This screen keeps that same non-specific wording rather than
      // guessing whether the username or the password was wrong.
      const message =
        err instanceof ApiError && err.status === 401
          ? "Incorrect username or password."
          : "Could not log in. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Card style={{ width: 360 }}>
        <Typography.Title level={3} style={{ textAlign: "center" }}>
          GARBATI Ops Console
        </Typography.Title>
        <Form layout="vertical" onFinish={handleSubmit}>
          {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />}
          <Form.Item label="Username" required>
            <Input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </Form.Item>
          <Form.Item label="Password" required>
            <Input.Password
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={isSubmitting}>
            Log in
          </Button>
        </Form>
      </Card>
    </div>
  );
}
