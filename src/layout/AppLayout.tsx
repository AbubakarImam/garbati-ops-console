import { useMemo } from "react";
import { Layout, Menu, Space, Tag, Typography, Button } from "antd";
import { LogoutOutlined } from "@ant-design/icons";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { canSeeJointApprovalConsole, canSeeReversalQueue, roleCan, ROLE_MATRIX } from "../auth/roles";
import type { OpsRole } from "../api/types";

const { Header, Sider, Content } = Layout;

interface NavItem {
  key: string;
  label: string;
  path: string;
  visible: (role: OpsRole | undefined) => boolean;
}

// DESIGN.md Section 5: one nav item per screen in Section 2's table, filtered against src/auth/roles.ts
// - the SAME matrix OpsApi's own Authorization/OpsRoles.cs enforces server-side. Restated here, not just
// in roles.ts, because this is the one place a reader would otherwise assume "the nav IS the security" -
// it is not (see roles.ts's own comment, and ApiErrorAlert.tsx for what actually happens on a direct
// URL visit without permission).
const NAV_ITEMS: NavItem[] = [
  { key: "lookup", label: "Customer & account lookup", path: "/customers", visible: () => true },
  {
    key: "customer-edit-stage",
    label: "Stage a customer edit",
    path: "/customer-edits/new",
    visible: (role) => roleCan(role, ROLE_MATRIX.stageCustomerEdit),
  },
  {
    key: "customer-edit-queue",
    label: "Customer edit approvals",
    path: "/customer-edits",
    visible: (role) => roleCan(role, ROLE_MATRIX.decideCustomerEdit),
  },
  {
    key: "reversal-create",
    label: "Request a reversal",
    path: "/reversals/new",
    visible: (role) => roleCan(role, ROLE_MATRIX.createReversal),
  },
  {
    key: "reversal-queue",
    label: "Reversal approvals",
    path: "/reversals",
    visible: canSeeReversalQueue,
  },
  {
    key: "testing-console",
    label: "Transfer/transaction console",
    path: "/console",
    visible: (role) => roleCan(role, ROLE_MATRIX.testingConsole),
  },
  {
    key: "staff",
    label: "Staff & role management",
    path: "/staff",
    visible: (role) => roleCan(role, ROLE_MATRIX.staffManagement),
  },
  {
    key: "joint-approvals",
    label: "Joint-account approval (test console)",
    path: "/joint-approvals",
    visible: canSeeJointApprovalConsole,
  },
];

export function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const visibleItems = useMemo(() => NAV_ITEMS.filter((item) => item.visible(user?.role)), [user?.role]);

  const selectedKey = useMemo(() => {
    const match = visibleItems.find(
      (item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`),
    );
    return match?.key;
  }, [location.pathname, visibleItems]);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider width={260} breakpoint="lg" collapsedWidth={0}>
        <div style={{ color: "#fff", padding: 16, fontWeight: 600 }}>GARBATI Ops Console</div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={selectedKey ? [selectedKey] : []}
          items={visibleItems.map((item) => ({ key: item.key, label: <Link to={item.path}>{item.label}</Link> }))}
        />
      </Sider>
      <Layout>
        <Header style={{ background: "#fff", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
          <Space>
            <Typography.Text>{user?.fullName}</Typography.Text>
            <Tag>{user?.role}</Tag>
            <Button icon={<LogoutOutlined />} onClick={() => void logout()}>
              Log out
            </Button>
          </Space>
        </Header>
        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
