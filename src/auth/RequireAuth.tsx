import { Spin } from "antd";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

// Gate is "is there a session at all", never "does this role make sense for this route" - role-gating
// is the nav's job only (DESIGN.md Section 5: a direct URL visit to a route the role can't use must
// still reach OpsApi and come back with a real 403, not a client-side guess that pre-empts the call).
export function RequireAuth() {
  const { user, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div style={{ display: "flex", justifyContent: "center", marginTop: 96 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
