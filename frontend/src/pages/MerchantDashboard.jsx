import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  Loader2,
  LogOut,
  Store,
  Users,
  Wallet,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { clearAuthSession, getStoredUser, reportApi } from "../services/api";

const EMPTY_DATA = {
  stats: {
    active_stores: 0,
    active_admins: 0,
    total_products: 0,
    estimated_revenue: 0,
  },
  performance: [],
  payment_summary: {
    paid_amount: 0,
    unpaid_amount: 0,
    paid_percentage: 0,
    unpaid_percentage: 0,
  },
  stores: [],
  admins: [],
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount || 0);

export default function MerchantDashboard() {
  const navigate = useNavigate();
  const currentUser = useMemo(() => getStoredUser(), []);
  const [dashboard, setDashboard] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    reportApi
      .merchantDashboard()
      .then((response) => {
        if (active) setDashboard(response.data);
      })
      .catch((requestError) => {
        if (!active) return;
        const detail = requestError?.response?.data?.detail;
        setError(typeof detail === "string" ? detail : "Failed to load merchant dashboard.");
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

  const stats = [
    {
      label: "Active Stores",
      value: dashboard.stats.active_stores,
      icon: <Store className="h-5 w-5" />,
      color: "text-cyan-300",
    },
    {
      label: "Active Admins",
      value: dashboard.stats.active_admins,
      icon: <Users className="h-5 w-5" />,
      color: "text-emerald-300",
    },
    {
      label: "Total Products",
      value: dashboard.stats.total_products,
      icon: <BarChart3 className="h-5 w-5" />,
      color: "text-violet-300",
    },
    {
      label: "Estimated Revenue",
      value: formatCurrency(dashboard.stats.estimated_revenue),
      icon: <Wallet className="h-5 w-5" />,
      color: "text-amber-300",
    },
  ];

  const paymentChartData = [
    {
      name: "Paid",
      value: Number(dashboard.payment_summary.paid_percentage || 0).toFixed(2),
      amount: dashboard.payment_summary.paid_amount,
      color: "#10B981",
    },
    {
      name: "Unpaid",
      value: Number(dashboard.payment_summary.unpaid_percentage || 0).toFixed(2),
      amount: dashboard.payment_summary.unpaid_amount,
      color: "#F43F5E",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <header className="border-b border-[#223355] bg-[#111D36]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#63C2B0] text-[#0F172A]">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[#63C2B0]">MyDuka</p>
              <h1 className="text-base font-semibold text-[#E2E8F0]">Merchant Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-right">
              <p className="font-medium text-[#E2E8F0]">
                {currentUser
                  ? `${currentUser.first_name} ${currentUser.last_name}`
                  : "Merchant User"}
              </p>
              <p className="text-xs text-[#E2E8F0]/70">Merchant</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-full border border-[#2B3D63] p-2 text-[#E2E8F0]/70 hover:bg-[#1A2947] hover:text-[#E2E8F0]"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 text-[#E2E8F0]">
        {loading ? (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-[#223355] bg-[#111D36] px-4 py-3 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-[#63C2B0]" />
            Loading merchant reports...
          </div>
        ) : null}
        {error ? (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-[#223355] bg-[#111D36] p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#E2E8F0]/70">{stat.label}</p>
                <span className={`rounded-lg bg-[#1A2947] p-2 ${stat.color}`}>{stat.icon}</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-[#E2E8F0]">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-[#223355] bg-[#111D36] p-6 shadow-sm">
            <h2 className="text-base font-semibold text-[#E2E8F0]">Product Performance</h2>
            <div className="mt-4 h-72 rounded-lg bg-[#0E1930] p-2">
              {dashboard.performance.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-[#E2E8F0]/60">
                  No performance data available.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard.performance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#223355" />
                    <XAxis dataKey="product" tick={{ fontSize: 12, fill: "#E2E8F0" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#E2E8F0" }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sales" name="Sales (KES)" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="profit" name="Profit (KES)" fill="#10B981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[#223355] bg-[#111D36] p-6 shadow-sm">
            <h2 className="text-base font-semibold text-[#E2E8F0]">Payment Status Overview</h2>
            <div className="mt-4 grid grid-cols-1 items-center gap-6 md:grid-cols-2">
              <div className="h-56 rounded-lg bg-[#0E1930] p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={paymentChartData} dataKey="value" outerRadius={86} paddingAngle={2}>
                      {paymentChartData.map((item) => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-4 text-sm">
                {paymentChartData.map((item) => (
                  <div key={item.name} className="rounded-lg border border-[#223355] bg-[#0E1930] p-3">
                    <p className="text-[#E2E8F0]/70">
                      {item.name} ({item.value}%)
                    </p>
                    <p className="text-lg font-semibold" style={{ color: item.color }}>
                      {formatCurrency(item.amount)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <section className="mt-8 rounded-xl border border-[#223355] bg-[#111D36] p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#E2E8F0]">Store Management</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            {dashboard.stores.length === 0 ? (
              <p className="text-sm text-[#E2E8F0]/65">No stores available yet.</p>
            ) : (
              dashboard.stores.map((store) => (
                <div key={store.id} className="rounded-xl border border-[#223355] bg-[#0E1930] p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[#E2E8F0]">{store.name}</h3>
                    <StatusBadge status={store.status} />
                  </div>
                  <p className="mt-2 text-xs text-[#E2E8F0]/70">{store.location}</p>
                  <p className="mt-2 text-xs text-[#E2E8F0]/70">
                    Admin: {store.admin_name || "Unassigned"}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="mt-8 rounded-xl border border-[#223355] bg-[#111D36] shadow-sm">
          <div className="border-b border-[#223355] px-6 py-4">
            <h2 className="text-base font-semibold text-[#E2E8F0]">Admin Management</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-[#E2E8F0]/60">
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Store</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.admins.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-6 text-[#E2E8F0]/65">
                      No admins found.
                    </td>
                  </tr>
                ) : (
                  dashboard.admins.map((admin) => (
                    <tr key={admin.id} className="border-t border-[#223355]">
                      <td className="px-6 py-4 font-medium text-[#E2E8F0]">{admin.name}</td>
                      <td className="px-6 py-4 text-[#E2E8F0]/70">{admin.email}</td>
                      <td className="px-6 py-4 text-[#E2E8F0]/70">{admin.store || "Unassigned"}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={admin.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

function StatusBadge({ status }) {
  const classes =
    status === "Active"
      ? "bg-emerald-300/20 text-emerald-200"
      : "bg-slate-300/20 text-slate-200";
  return <span className={`rounded-full px-3 py-1 text-xs font-medium ${classes}`}>{status}</span>;
}
