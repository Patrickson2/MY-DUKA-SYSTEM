import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, LogOut } from "lucide-react";
import {
  getDashboardRoute,
  getStoredUser,
  logoutSession,
  normalizeRole,
} from "../services/api";
import { notificationsApi } from "../services/api";

const opsLinks = [
  { to: "/suppliers", label: "Suppliers" },
  { to: "/purchase-orders", label: "Purchase Orders" },
  { to: "/transfers", label: "Transfers" },
  { to: "/returns", label: "Returns" },
  { to: "/sales", label: "Sales" },
  { to: "/expenses", label: "Expenses" },
  { to: "/analytics", label: "Reporting" },
];

function getDefaultLinks(role) {
  const dashboardLink = { to: getDashboardRoute(role), label: "Dashboard" };
  const inviteLink = { to: "/merchant/invites", label: "Admin Invites" };
  const storeLink = { to: "/merchant/stores", label: "Add Store" };
  const storeGraphLink = { to: "/merchant/graphs", label: "Store Graphs" };
  const adminReportLink = { to: "/admin/reports", label: "Reports" };
  const messagesLink = { to: "/messages", label: "Messages" };
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === "merchant") {
    return [dashboardLink, storeGraphLink, inviteLink, storeLink, messagesLink, ...opsLinks];
  }
  if (normalizedRole === "admin") {
    return [dashboardLink, adminReportLink, messagesLink];
  }
  if (normalizedRole === "clerk") {
    return [dashboardLink, messagesLink];
  }
  return [dashboardLink];
}

export default function PageShell({ title, subtitle, children, links, sidebarContent }) {
  const user = getStoredUser();
  const location = useLocation();
  const navigate = useNavigate();
  const navLinks = links ?? getDefaultLinks(user?.role);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [activeNotification, setActiveNotification] = useState(null);
  const notificationsRef = useRef(null);

  const handleLogout = async () => {
    await logoutSession();
    navigate("/");
  };

  const resolveNotificationRoute = (notification) => {
    const normalizedRole = normalizeRole(user?.role);
    const params = new URLSearchParams();
    if (notification.category === "pending_supply_request") {
      if (normalizedRole === "admin") {
        params.set("tab", "requests");
        return `/admin?${params.toString()}`;
      }
    }
    if (notification.category === "supply_request_status") {
      if (normalizedRole === "clerk") {
        params.set("tab", "requests");
        return `/clerk?${params.toString()}`;
      }
    }
    if (notification.category === "unpaid_inventory") {
      if (normalizedRole === "admin") {
        params.set("tab", "payments");
        return `/admin?${params.toString()}`;
      }
    }
    if (notification.category === "message") {
      if (normalizedRole === "admin" || normalizedRole === "merchant" || normalizedRole === "clerk") {
        return "/messages";
      }
    }
    if (notification.category === "low_stock") {
      if (normalizedRole === "admin") {
        params.set("tab", "requests");
        return `/admin?${params.toString()}`;
      }
    }
    return getDashboardRoute(normalizedRole);
  };

  const loadNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const [countRes, listRes] = await Promise.all([
        notificationsApi.unreadCount(),
        notificationsApi.list({ limit: 8 }),
      ]);
      setUnreadCount(countRes.data?.unread_count ?? 0);
      setNotifications(listRes.data || []);
      setActiveNotification((prev) => {
        if (!prev) return null;
        const refreshed = (listRes.data || []).find((item) => item.id === prev.id);
        return refreshed || null;
      });
    } finally {
      setNotificationsLoading(false);
    }
  };

  const handleToggleNotifications = async () => {
    const next = !isNotificationsOpen;
    setIsNotificationsOpen(next);
    if (next) {
      await loadNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    setNotificationsLoading(true);
    await notificationsApi.markAllRead();
    setUnreadCount(0);
    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
    setNotificationsLoading(false);
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.is_read) {
      await notificationsApi.markRead(notification.id);
      setUnreadCount((prev) => Math.max(0, prev - 1));
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notification.id ? { ...item, is_read: true } : item
        )
      );
    }
    setActiveNotification(notification);
    navigate(resolveNotificationRoute(notification));
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const countRes = await notificationsApi.unreadCount();
        if (active) setUnreadCount(countRes.data?.unread_count ?? 0);
      } catch {
        // Ignore notification errors to avoid blocking layout.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isNotificationsOpen) return;
    const handleOutsideClick = (event) => {
      if (!notificationsRef.current) return;
      if (!notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isNotificationsOpen]);

  return (
    <div className="min-h-screen bg-[#F0FDF4]">
      <header className="border-b border-[#D1FAE5] bg-white">
        <div className="mx-auto flex w-full max-w-screen-2xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm uppercase tracking-wide text-[#34D399]">MyDuka</p>
            <h1 className="text-2xl font-semibold text-[#064E3B]">{title}</h1>
            {subtitle ? <p className="text-sm text-[#6B7280]">{subtitle}</p> : null}
          </div>
          <div className="flex items-center gap-4 text-base">
            <div className="text-right">
              <p className="font-medium text-[#064E3B]">
                {user ? `${user.first_name} ${user.last_name}` : "User"}
              </p>
              <p className="text-sm text-[#6B7280]">{user?.role || "Role"}</p>
            </div>
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={handleToggleNotifications}
                className="relative rounded-lg border border-[#D1FAE5] p-2.5 text-[#6B7280] hover:bg-[#D1FAE5] hover:text-[#064E3B]"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#DC2626] px-1 text-[10px] font-semibold text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </button>
              {isNotificationsOpen ? (
                <div className="absolute right-0 z-10 mt-2 w-72 rounded-xl border border-[#D1FAE5] bg-white p-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[#064E3B]">Notifications</p>
                    <button
                      onClick={handleMarkAllRead}
                      disabled={notificationsLoading || notifications.length === 0}
                      className="text-[10px] font-semibold text-[#15803D] disabled:opacity-50"
                      type="button"
                    >
                      Mark all read
                    </button>
                  </div>
                  <div className="mt-2 space-y-2">
                    {notificationsLoading ? (
                      <p className="text-xs text-[#6B7280]">Loading...</p>
                    ) : notifications.length === 0 ? (
                      <p className="text-xs text-[#6B7280]">No new notifications.</p>
                    ) : (
                      notifications.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleNotificationClick(item)}
                          className={`w-full rounded-lg border px-3 py-2 text-left hover:bg-[#D1FAE5] ${
                            item.is_read
                              ? "border-[#D1FAE5] bg-white"
                              : "border-[#34D399]/40 bg-[#F0FDF4]"
                          }`}
                        >
                          <p className="text-xs font-semibold text-[#064E3B]">{item.title}</p>
                          <p className="text-xs text-[#6B7280]">{item.message}</p>
                        </button>
                      ))
                    )}
                  </div>
                  {activeNotification ? (
                    <div className="mt-3 rounded-lg border border-[#D1FAE5] bg-white p-3">
                      <p className="text-xs font-semibold text-[#064E3B]">Selected</p>
                      <p className="mt-1 text-xs text-[#6B7280]">{activeNotification.title}</p>
                      <p className="mt-2 text-xs text-[#064E3B]">
                        {activeNotification.message}
                      </p>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-[#D1FAE5] p-2.5 text-[#6B7280] hover:bg-[#D1FAE5] hover:text-[#064E3B]"
              aria-label="Log out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
        <nav className="mx-auto flex w-full max-w-screen-2xl flex-wrap items-center gap-3 px-6 pb-5 text-base lg:hidden">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`rounded-full border px-4 py-2 ${
                  isActive
                    ? "border-[#34D399] bg-[#D1FAE5] text-[#064E3B]"
                    : "border-[#D1FAE5] text-[#6B7280] hover:bg-[#D1FAE5]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-screen-2xl px-6 py-10 text-[#064E3B]">
        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="hidden w-72 shrink-0 lg:block">
            <div className="rounded-2xl border border-[#D1FAE5] bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold uppercase tracking-wide text-[#6B7280]">
                Operations
              </p>
              <div className="mt-4 flex flex-col gap-2 text-base">
                {navLinks.map((link) => {
                  const isActive = location.pathname === link.to;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`rounded-lg px-4 py-2.5 ${
                        isActive
                          ? "bg-[#D1FAE5] text-[#064E3B] font-semibold"
                          : "text-[#6B7280] hover:bg-[#D1FAE5] hover:text-[#064E3B]"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>
            {sidebarContent ? (
              <div className="mt-6 rounded-2xl border border-[#D1FAE5] bg-white p-4 shadow-sm">
                {sidebarContent}
              </div>
            ) : null}
          </aside>

          <section className="min-w-0 flex-1">{children}</section>
        </div>
      </main>
    </div>
  );
}
