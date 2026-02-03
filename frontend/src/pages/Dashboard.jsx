import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Box,
  Loader2,
  LogOut,
  PackagePlus,
  Send,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { clearAuthSession, getStoredUser, reportApi } from "../services/api";

const EMPTY_DATA = {
  stats: {
    total_products: 0,
    total_stock: 0,
    spoilt_items: 0,
  },
  products: [],
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount || 0);

function getInventoryStatus(stock) {
  if (stock <= 0) return "Out of Stock";
  if (stock <= 20) return "Low Stock";
  return "In Stock";
}

export default function Dashboard() {
  const navigate = useNavigate();
  const currentUser = useMemo(() => getStoredUser(), []);
  const [activeForm, setActiveForm] = useState("record");
  const [dashboard, setDashboard] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    reportApi
      .clerkDashboard()
      .then((response) => {
        if (active) {
          setDashboard(response.data);
        }
      })
      .catch((requestError) => {
        if (!active) return;
        const detail = requestError?.response?.data?.detail;
        setError(typeof detail === "string" ? detail : "Failed to load clerk dashboard.");
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
      label: "Total Products",
      value: dashboard.stats.total_products,
      icon: <Box className="h-5 w-5" />,
      color: "text-cyan-300",
    },
    {
      label: "Total Stock",
      value: dashboard.stats.total_stock,
      icon: <TrendingUp className="h-5 w-5" />,
      color: "text-emerald-300",
    },
    {
      label: "Spoilt Items",
      value: dashboard.stats.spoilt_items,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: "text-amber-300",
    },
  ];

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <header className="border-b border-[#223355] bg-[#111D36]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#63C2B0] font-bold text-[#0F172A]">
              M
            </div>
            <div>
              <h1 className="text-base font-semibold text-[#E2E8F0]">MyDuka</h1>
              <p className="text-xs text-[#E2E8F0]/70">Data Entry Clerk Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-right">
              <p className="font-medium text-[#E2E8F0]">
                {currentUser ? `${currentUser.first_name} ${currentUser.last_name}` : "Clerk User"}
              </p>
              <p className="text-xs text-[#E2E8F0]/70">Clerk</p>
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

      <main className="mx-auto max-w-6xl px-6 py-8">
        {loading ? (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-[#223355] bg-[#111D36] px-4 py-3 text-sm text-[#E2E8F0]/80">
            <Loader2 className="h-4 w-4 animate-spin text-[#63C2B0]" />
            Loading clerk dashboard...
          </div>
        ) : null}
        {error ? (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <button
            onClick={() => setActiveForm("record")}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              activeForm === "record"
                ? "bg-[#2563EB] text-white"
                : "bg-[#1A2947] text-[#E2E8F0]/80 hover:bg-[#223355]"
            }`}
          >
            <PackagePlus className="h-4 w-4" />
            Record New Product
          </button>
          <button
            onClick={() => setActiveForm("request")}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              activeForm === "request"
                ? "bg-[#059669] text-white"
                : "bg-[#1A2947] text-[#E2E8F0]/80 hover:bg-[#223355]"
            }`}
          >
            <Send className="h-4 w-4" />
            Request Supply
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-[#223355] bg-[#111D36] p-6">
          {activeForm === "record" ? (
            <>
              <h2 className="text-base font-semibold text-[#E2E8F0]">Record New Product</h2>
              <p className="mt-1 text-sm text-[#E2E8F0]/65">
                Product submission will be connected to backend create endpoints next.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold text-[#E2E8F0]">Request Supply</h2>
              <p className="mt-1 text-sm text-[#E2E8F0]/65">
                Supply request form is ready; submission wiring is next after product lookup endpoint.
              </p>
            </>
          )}
        </div>

        <section className="mt-8 rounded-xl border border-[#223355] bg-[#111D36] shadow-sm">
          <div className="border-b border-[#223355] px-6 py-4">
            <h2 className="text-base font-semibold text-[#E2E8F0]">My Recorded Products</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-[#E2E8F0]/60">
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Stock</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Spoilt</th>
                  <th className="px-6 py-3">Buy Price</th>
                  <th className="px-6 py-3">Sell Price</th>
                  <th className="px-6 py-3">Payment</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.products.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6 text-[#E2E8F0]/65" colSpan={8}>
                      No recorded inventory yet.
                    </td>
                  </tr>
                ) : (
                  dashboard.products.map((item) => (
                    <tr key={item.inventory_id} className="border-t border-[#223355]">
                      <td className="px-6 py-4 font-medium text-[#E2E8F0]">{item.product}</td>
                      <td className="px-6 py-4 text-[#E2E8F0]/70">{item.category || "-"}</td>
                      <td className="px-6 py-4 text-[#E2E8F0]">{item.stock}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={getInventoryStatus(item.stock)} />
                      </td>
                      <td className="px-6 py-4 text-[#E2E8F0]">{item.spoil}</td>
                      <td className="px-6 py-4 text-[#E2E8F0]">{formatCurrency(item.buy_price)}</td>
                      <td className="px-6 py-4 text-[#E2E8F0]">{formatCurrency(item.sell_price)}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={item.payment_status} />
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
  const styles = {
    "In Stock": "bg-emerald-300/20 text-emerald-200",
    "Low Stock": "bg-amber-300/20 text-amber-200",
    "Out of Stock": "bg-rose-300/20 text-rose-200",
    Paid: "bg-emerald-300/20 text-emerald-200",
    Unpaid: "bg-rose-300/20 text-rose-200",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status] || "bg-[#1A2947] text-[#E2E8F0]/80"}`}>
      {status}
    </span>
  );
}
