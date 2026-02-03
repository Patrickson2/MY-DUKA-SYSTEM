import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ClipboardCheck,
  CreditCard,
  Loader2,
  LogOut,
  Store,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { clearAuthSession, getStoredUser, reportApi } from "../services/api";

const EMPTY_DASHBOARD = {
  stats: {
    active_clerks: 0,
    pending_requests: 0,
    unpaid_products: 0,
    store_value: 0,
  },
  supply_requests: [],
  payment_status: [],
  clerks: [],
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount || 0);

const formatDate = (value) =>
  new Date(value).toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export default function AdminPanel() {
  const navigate = useNavigate();
  const currentUser = useMemo(() => getStoredUser(), []);
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    reportApi
      .adminDashboard()
      .then((response) => {
        if (active) {
          setDashboard(response.data);
        }
      })
      .catch((requestError) => {
        if (!active) return;
        const detail = requestError?.response?.data?.detail;
        setError(typeof detail === "string" ? detail : "Failed to load admin dashboard.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/", { replace: true });
  };

  const statsCards = [
    {
      title: "Active Clerks",
      value: dashboard.stats.active_clerks,
      trend: "Current active users",
      icon: <Users className="h-5 w-5" />,
    },
    {
      title: "Pending Requests",
      value: dashboard.stats.pending_requests,
      trend: "Needs review",
      icon: <ClipboardCheck className="h-5 w-5" />,
    },
    {
      title: "Unpaid Products",
      value: dashboard.stats.unpaid_products,
      trend: "Payment follow-up",
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      title: "Store Value",
      value: formatCurrency(dashboard.stats.store_value),
      trend: "Inventory valuation",
      icon: <Store className="h-5 w-5" />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <header className="border-b border-[#1E293B] bg-[#111D36]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#63C2B0] font-bold text-[#0F172A]">
              M
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[#63C2B0]">MyDuka</p>
              <h1 className="text-xl font-semibold text-[#E2E8F0]">Admin Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative rounded-full border border-[#2B3D63] p-2 text-[#E2E8F0]/70 hover:text-[#E2E8F0]">
              <Bell className="h-5 w-5" />
            </button>
            <div className="text-right">
              <p className="text-sm font-medium text-[#E2E8F0]">
                {currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : "Admin User"}
              </p>
              <p className="text-xs text-[#E2E8F0]/60">Admin</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-[#2B3D63] p-2 text-[#E2E8F0]/70 hover:bg-[#1E293B] hover:text-[#E2E8F0]"
              aria-label="Log out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 text-[#E2E8F0]">
        {loading ? (
          <div className="flex items-center gap-2 rounded-xl border border-[#223355] bg-[#111D36] px-4 py-3 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-[#63C2B0]" />
            Loading admin data...
          </div>
        ) : null}
        {error ? (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {statsCards.map((card) => (
            <div key={card.title} className="rounded-xl border border-[#223355] bg-[#111D36] p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#E2E8F0]/70">{card.title}</p>
                <span className="rounded-lg bg-[#1A2947] p-2 text-[#63C2B0]">{card.icon}</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-[#E2E8F0]">{card.value}</p>
              <p className="mt-1 text-xs text-[#E2E8F0]/60">{card.trend}</p>
            </div>
          ))}
        </div>

        <Section title="Supply Requests" subtitle="Review and approve stock refill requests.">
          <DataTable
            headers={["Product", "Quantity", "Requested By", "Date", "Notes", "Status"]}
            rows={dashboard.supply_requests}
            renderRow={(item) => (
              <tr key={item.id} className="border-t border-[#223355]">
                <td className="py-3">{item.product}</td>
                <td className="py-3">{item.quantity}</td>
                <td className="py-3">{item.requested_by}</td>
                <td className="py-3">{formatDate(item.date)}</td>
                <td className="py-3">{item.notes || "-"}</td>
                <td className="py-3">
                  <StatusBadge status={item.status} />
                </td>
              </tr>
            )}
            emptyMessage="No supply requests at the moment."
          />
        </Section>

        <Section title="Product Payment Status" subtitle="Track payment status by product inventory entry.">
          <DataTable
            headers={["Product", "Stock", "Buy Price", "Payment Status"]}
            rows={dashboard.payment_status}
            renderRow={(item) => (
              <tr key={item.inventory_id} className="border-t border-[#223355]">
                <td className="py-3">{item.product}</td>
                <td className="py-3">{item.stock}</td>
                <td className="py-3">{formatCurrency(item.buy_price)}</td>
                <td className="py-3">
                  <StatusBadge status={item.payment_status} />
                </td>
              </tr>
            )}
            emptyMessage="No inventory payment records yet."
          />
        </Section>

        <Section title="Clerk Management" subtitle="View assigned clerks and account status.">
          <DataTable
            headers={["Name", "Email", "Joined", "Status"]}
            rows={dashboard.clerks}
            renderRow={(item) => (
              <tr key={item.id} className="border-t border-[#223355]">
                <td className="py-3">{item.name}</td>
                <td className="py-3 text-[#E2E8F0]/70">{item.email}</td>
                <td className="py-3">{formatDate(item.joined_date)}</td>
                <td className="py-3">
                  <StatusBadge status={item.status} />
                </td>
              </tr>
            )}
            emptyMessage="No clerks found for this admin."
          />
        </Section>
      </main>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <section className="mt-8 rounded-xl border border-[#223355] bg-[#111D36] p-5">
      <h2 className="text-lg font-semibold text-[#E2E8F0]">{title}</h2>
      <p className="mt-1 text-sm text-[#E2E8F0]/65">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DataTable({ headers, rows, renderRow, emptyMessage }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[650px] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-[#E2E8F0]/55">
            {headers.map((header) => (
              <th key={header} className="pb-3 pr-4">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="py-6 text-sm text-[#E2E8F0]/65">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map(renderRow)
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }) {
  const palette = {
    Pending: "bg-amber-300/20 text-amber-200",
    Approved: "bg-emerald-300/20 text-emerald-200",
    Declined: "bg-rose-300/20 text-rose-200",
    Paid: "bg-emerald-300/20 text-emerald-200",
    Unpaid: "bg-rose-300/20 text-rose-200",
    Active: "bg-emerald-300/20 text-emerald-200",
    Inactive: "bg-slate-300/20 text-slate-200",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${palette[status] || "bg-[#1A2947] text-[#E2E8F0]"}`}>
      {status}
    </span>
  );
}
