/**
 * Admin reports page.
 * Shows clerk performance and payment status charts.
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PageShell from "../components/PageShell";
import { reportApi } from "../services/api";

const EMPTY_DASHBOARD = {
  clerk_performance: [],
  payment_status: [],
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount || 0);

export default function AdminReports() {
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReports = async () => {
    const response = await reportApi.adminDashboard();
    setDashboard(response.data);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        await loadReports();
      } catch (requestError) {
        if (!active) return;
        const detail = requestError?.response?.data?.detail;
        setError(typeof detail === "string" ? detail : "Failed to load admin reports.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const clerkChartData = useMemo(
    () =>
      dashboard.clerk_performance.map((item) => ({
        name: item.name,
        recorded: Number(item.recorded_items || 0),
        stock: Number(item.total_stock_recorded || 0),
        spoilt: Number(item.spoilt_recorded || 0),
      })),
    [dashboard.clerk_performance]
  );

  const paymentChartData = useMemo(() => {
    const totals = dashboard.payment_status.reduce(
      (acc, item) => {
        const status = (item.payment_status || "Unpaid").toLowerCase();
        const key = status === "paid" ? "Paid" : "Unpaid";
        const stock = Number(item.stock || 0);
        const value = stock * Number(item.buy_price || 0);
        acc[key].count += stock;
        acc[key].value += value;
        return acc;
      },
      {
        Paid: { count: 0, value: 0 },
        Unpaid: { count: 0, value: 0 },
      }
    );
    return [
      { name: "Paid", count: totals.Paid.count, value: totals.Paid.value },
      { name: "Unpaid", count: totals.Unpaid.count, value: totals.Unpaid.value },
    ];
  }, [dashboard.payment_status]);

  return (
    <PageShell title="Reports" subtitle="Clerk performance and payment status insights.">
      {loading ? (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-[#D1FAE5] bg-white px-4 py-3 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-[#34D399]" />
          Loading reports...
        </div>
      ) : null}
      {error ? (
        <div className="mb-6 rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-[#D1FAE5] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#064E3B]">Clerk Performance (Line)</h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            Entries recorded, stock recorded, and spoilt items by clerk.
          </p>
          <div className="mt-4 h-72 rounded-lg bg-white p-2">
            {clerkChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-[#6B7280]">
                No clerk performance data yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={clerkChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D1FAE5" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#064E3B" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#064E3B" }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="recorded"
                    name="Entries"
                    stroke="hsl(222,60%,28%)"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="stock"
                    name="Stock Recorded"
                    stroke="hsl(35,90%,55%)"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="spoilt"
                    name="Spoilt"
                    stroke="#DC2626"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-[#D1FAE5] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#064E3B]">Product Payment Status (Bar)</h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            Paid vs unpaid stock counts and total purchase value.
          </p>
          <div className="mt-4 h-72 rounded-lg bg-white p-2">
            {paymentChartData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-[#6B7280]">
                No payment status data yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D1FAE5" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#064E3B" }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "#064E3B" }} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12, fill: "#064E3B" }}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip
                    formatter={(value, name) =>
                      name === "Value" ? formatCurrency(value) : value
                    }
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="count" name="Stock Count" fill="hsl(222,60%,28%)" />
                  <Bar yAxisId="right" dataKey="value" name="Value" fill="hsl(35,90%,55%)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
