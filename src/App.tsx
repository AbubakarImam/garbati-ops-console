import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigProvider } from "antd";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { RequireAuth } from "./auth/RequireAuth";
import { AppLayout } from "./layout/AppLayout";
import { LoginPage } from "./pages/LoginPage";
import { CustomerLookupPage } from "./pages/CustomerLookupPage";
import { CustomerEditStagePage } from "./pages/CustomerEditStagePage";
import { CustomerEditQueuePage } from "./pages/CustomerEditQueuePage";
import { ReversalCreatePage } from "./pages/ReversalCreatePage";
import { ReversalQueuePage } from "./pages/ReversalQueuePage";
import { TestingConsolePage } from "./pages/TestingConsolePage";
import { StaffManagementPage } from "./pages/StaffManagementPage";
import { JointApprovalConsolePage } from "./pages/JointApprovalConsolePage";

// DESIGN.md Section 4 step 4: a 401 anywhere routes to Login through one shared handler
// (AuthContext). React Query's own retry would otherwise mask that behind repeated silent retries, so
// retries are off here - a failed call should surface (or redirect) immediately, not be retried blindly
// against a session that may already be gone.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

// DESIGN.md Section 5, restated at the routing layer: every route below requires only "is there a
// session" (RequireAuth) - never a role check that would pre-empt the call. A role mismatch is left to
// reach OpsApi and come back as a real 403 (ApiErrorAlert renders it), exactly as Section 5 asks.
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/customers" replace />} />
          <Route path="/customers" element={<CustomerLookupPage />} />
          <Route path="/customer-edits/new" element={<CustomerEditStagePage />} />
          <Route path="/customer-edits" element={<CustomerEditQueuePage />} />
          <Route path="/reversals/new" element={<ReversalCreatePage />} />
          <Route path="/reversals" element={<ReversalQueuePage />} />
          <Route path="/console" element={<TestingConsolePage />} />
          <Route path="/staff" element={<StaffManagementPage />} />
          <Route path="/joint-approvals" element={<JointApprovalConsolePage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ConfigProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ConfigProvider>
  );
}
