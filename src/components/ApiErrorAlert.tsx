import { Alert } from "antd";
import { ApiError } from "../api/client";

// Shared rendering for "a call to OpsApi failed" - in particular the 403 case DESIGN.md Section 5 asks
// for explicitly: "a route visited without permission shows the real 403 OpsApi returns as a plain 'not
// permitted' state, not a client-side guess that pre-empts the call." This component is that plain
// state - it never runs any role check of its own, it only describes whatever OpsApi actually said.
export function ApiErrorAlert({ error }: { error: unknown }) {
  if (!error) {
    return null;
  }

  if (error instanceof ApiError && error.status === 403) {
    return (
      <Alert
        type="warning"
        showIcon
        message="Not permitted"
        description="OpsApi rejected this action for your current role. This is the server's own decision, not something this screen guessed."
      />
    );
  }

  if (error instanceof ApiError && error.status === 404) {
    return <Alert type="warning" showIcon message="Not found" />;
  }

  const message = error instanceof Error ? error.message : "Something went wrong.";
  return <Alert type="error" showIcon message="Request failed" description={message} />;
}
