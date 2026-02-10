/**
 * Merchant store graphs page.
 * Shows all reporting charts for store-level insights.
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import PageShell from "../components/PageShell";
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
import { inventoryApi, productsApi, reportApi } from "../services/api";

const EMPTY_DATA = {
  performance: [],
  payment_summary: {
    paid_amount: 0,
    unpaid_amount: 0,
    paid_percentage: 0,
    unpaid_percentage: 0,
  },
  stores: [],
};

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(amount || 0);

export default function MerchantStoreGraphs() {
  const [dashboard, setDashboard] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("store");
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [productMap, setProductMap] = useState({});
  const [storeInventory, setStoreInventory] = useState([]);
  const [paidInventory, setPaidInventory] = useState([]);
  const [unpaidInventory, setUnpaidInventory] = useState([]);
  const [storeLoading, setStoreLoading] = useState(false);

  const loadDashboard = async () => {
    const [dashboardRes, productsRes] = await Promise.all([
      reportApi.merchantDashboard(),
      productsApi.list({ limit: 500 }),
    ]);
    const nextDashboard = dashboardRes.data;
    setDashboard(nextDashboard);
    setProductMap(
      productsRes.data.reduce((acc, product) => {
        acc[product.id] = product.name;
        return acc;
      }, {})
    );
    if (!selectedStoreId && nextDashboard.stores.length > 0) {
      setSelectedStoreId(String(nextDashboard.stores[0].id));
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        await loadDashboard();
      } catch (requestError) {
        if (!active) return;
        const detail = requestError?.response?.data?.detail;
        setError(typeof detail === "string" ? detail : "Failed to load store graphs.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const storeId = Number(selectedStoreId);
    if (!storeId) return undefined;
    (async () => {
      try {
        setStoreLoading(true);
        const [inventoryRes, paidRes, unpaidRes] = await Promise.all([
          inventoryApi.list({ store_id: storeId, limit: 200 }),
          inventoryApi.list({ store_id: storeId, payment_status: "paid", limit: 200 }),
          inventoryApi.list({ store_id: storeId, payment_status: "unpaid", limit: 200 }),
        ]);
        if (!active) return;
        setStoreInventory(inventoryRes.data);
        setPaidInventory(paidRes.data);
        setUnpaidInventory(unpaidRes.data);
      } catch (requestError) {
        if (!active) return;
        const detail = requestError?.response?.data?.detail;
        setError(typeof detail === "string" ? detail : "Failed to load store data.");
      } finally {
        if (active) setStoreLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [selectedStoreId]);

  const paymentChartData = [
    {
      name: "Paid",
      value: Number(dashboard.payment_summary.paid_percentage || 0),
      amount: dashboard.payment_summary.paid_amount,
      color: "hsl(35,90%,55%)",
    },
    {
      name: "Unpaid",
      value: Number(dashboard.payment_summary.unpaid_percentage || 0),
      amount: dashboard.payment_summary.unpaid_amount,
      color: "#DC2626",
    },
  ];

  const storeChartData = dashboard.stores.map((store) => ({
    name: store.name,
    sales: Number(store.sales_total || 0),
    paid: Number(store.paid_total || 0),
    unpaid: Number(store.unpaid_total || 0),
  }));

  const productPerformanceData = useMemo(() => {
    const grouped = {};
    storeInventory.forEach((item) => {
      const key = item.product_id;
      if (!grouped[key]) {
        grouped[key] = {
          id: key,
          name: productMap[key] || `Product ${key}`,
          received: 0,
          inStock: 0,
          spoilt: 0,
          buyValue: 0,
          sellValue: 0,
        };
      }
      grouped[key].received += item.quantity_received || 0;
      grouped[key].inStock += item.quantity_in_stock || 0;
      grouped[key].spoilt += item.quantity_spoilt || 0;
      grouped[key].buyValue += (item.quantity_received || 0) * (item.buying_price || 0);
      grouped[key].sellValue += (item.quantity_received || 0) * (item.selling_price || 0);
    });
    return Object.values(grouped);
  }, [storeInventory, productMap]);

  const selectedStore = dashboard.stores.find((store) => String(store.id) === selectedStoreId);
  const selectedStoreChart = selectedStore
    ? [
        {
          name: selectedStore.name,
          sales: Number(selectedStore.sales_total || 0),
          paid: Number(selectedStore.paid_total || 0),
          unpaid: Number(selectedStore.unpaid_total || 0),
        },
      ]
    : [];

  return (
    <PageShell title="Store Graphs" subtitle="Store-by-store reporting and performance insights.">
      {loading ? (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-[#D1FAE5] bg-white px-4 py-3 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-[#34D399]" />
          Loading store graphs...
        </div>
      ) : null}
      {error ? (
        <div className="mb-6 rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border border-[#D1FAE5] bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "store", label: "Store Overview" },
              { id: "products", label: "Product Performance" },
              { id: "payments", label: "Paid vs Unpaid" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  activeTab === tab.id
                    ? "bg-[#D1FAE5] text-[#064E3B]"
                    : "text-[#6B7280] hover:bg-[#F0FDF4]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-sm text-[#6B7280]">
            <span>Store</span>
            <select
              value={selectedStoreId}
              onChange={(event) => setSelectedStoreId(event.target.value)}
              className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-1.5 text-sm text-[#064E3B]"
            >
              <option value="">Select store</option>
              {dashboard.stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {activeTab === "store" ? (
        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#D1FAE5] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#064E3B]">Product Performance</h2>
          <div className="mt-4 h-72 rounded-lg bg-white p-2">
            {dashboard.performance.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-[#6B7280]">
                No performance data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard.performance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D1FAE5" />
                  <XAxis dataKey="product" tick={{ fontSize: 12, fill: "#064E3B" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#064E3B" }} />
                  <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
                  <Legend />
                  <Bar dataKey="sales" name="Sales (KES)" fill="hsl(222,60%,28%)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="profit" name="Profit (KES)" fill="hsl(35,90%,55%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#D1FAE5] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#064E3B]">Payment Status Overview</h2>
          <div className="mt-4 grid grid-cols-1 items-center gap-6 md:grid-cols-2">
            <div className="h-56 rounded-lg bg-white p-2">
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
                <div key={item.name} className="rounded-lg border border-[#D1FAE5] bg-white p-3">
                  <p className="text-[#6B7280]">
                    {item.name} ({item.value.toFixed(2)}%)
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

          <section className="rounded-xl border border-[#D1FAE5] bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#064E3B]">Store Performance Overview</h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          Compare sales and payment status across all stores.
        </p>
        <div className="mt-4 h-72 rounded-lg bg-white p-2">
          {storeChartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-[#6B7280]">
              No store data available.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={storeChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#D1FAE5" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#064E3B" }} />
                <YAxis tick={{ fontSize: 12, fill: "#064E3B" }} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="sales" name="Sales" fill="hsl(222,60%,28%)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="paid" name="Paid" fill="hsl(35,90%,55%)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="unpaid" name="Unpaid" fill="#DC2626" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

          <section className="rounded-xl border border-[#D1FAE5] bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#064E3B]">Store-by-Store Performance</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {dashboard.stores.length === 0 ? (
            <p className="text-sm text-[#6B7280]">No stores available yet.</p>
          ) : (
            dashboard.stores.map((store) => (
              <div key={store.id} className="rounded-xl border border-[#D1FAE5] bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-[#064E3B]">{store.name}</h3>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      store.status === "Active"
                        ? "bg-[#D1FAE5] text-[#15803D]"
                        : "bg-[#D1FAE5] text-[#6B7280]"
                    }`}
                  >
                    {store.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#6B7280]">{store.location}</p>
                <p className="mt-2 text-xs text-[#6B7280]">Admin: {store.admin_name || "Unassigned"}</p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <Metric label="Sales" value={formatCurrency(store.sales_total)} />
                  <Metric label="Paid" value={formatCurrency(store.paid_total)} />
                  <Metric label="Unpaid" value={formatCurrency(store.unpaid_total)} />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
        </div>
      ) : null}

      {activeTab === "products" ? (
        <section className="mt-6 rounded-xl border border-[#D1FAE5] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#064E3B]">Product Performance by Store</h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            {selectedStore ? `Showing ${selectedStore.name}` : "Select a store to view product performance."}
          </p>
          <div className="mt-4 h-72 rounded-lg bg-white p-2">
            {storeLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-[#6B7280]">
                Loading store inventory...
              </div>
            ) : productPerformanceData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-[#6B7280]">
                No product records for this store.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#D1FAE5" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#064E3B" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#064E3B" }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="sellValue" name="Stock Value" fill="hsl(222,60%,28%)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="buyValue" name="Cost Value" fill="hsl(35,90%,55%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-[#6B7280]">
                  <th className="pb-3">Product</th>
                  <th className="pb-3">Received</th>
                  <th className="pb-3">In Stock</th>
                  <th className="pb-3">Spoilt</th>
                  <th className="pb-3">Stock Value</th>
                </tr>
              </thead>
              <tbody>
                {productPerformanceData.map((item) => (
                  <tr key={item.id} className="border-t border-[#D1FAE5]">
                    <td className="py-3 font-medium">{item.name}</td>
                    <td className="py-3 text-[#6B7280]">{item.received}</td>
                    <td className="py-3 text-[#6B7280]">{item.inStock}</td>
                    <td className="py-3 text-[#6B7280]">{item.spoilt}</td>
                    <td className="py-3 text-[#6B7280]">{formatCurrency(item.sellValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {activeTab === "payments" ? (
        <section className="mt-6 rounded-xl border border-[#D1FAE5] bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-[#064E3B]">Paid vs Unpaid Products</h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            {selectedStore ? `Showing ${selectedStore.name}` : "Select a store to view payment status."}
          </p>
          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-[#064E3B]">Paid Products</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-[#6B7280]">
                      <th className="pb-3">Product</th>
                      <th className="pb-3">Stock</th>
                      <th className="pb-3">Buy Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storeLoading ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-sm text-[#6B7280]">
                          Loading...
                        </td>
                      </tr>
                    ) : paidInventory.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-sm text-[#6B7280]">
                          No paid products for this store.
                        </td>
                      </tr>
                    ) : (
                      paidInventory.map((item) => (
                        <tr key={item.id} className="border-t border-[#D1FAE5]">
                          <td className="py-3 font-medium">
                            {productMap[item.product_id] || `Product ${item.product_id}`}
                          </td>
                          <td className="py-3 text-[#6B7280]">{item.quantity_in_stock}</td>
                          <td className="py-3 text-[#6B7280]">{formatCurrency(item.buying_price)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#064E3B]">Unpaid Products</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-[#6B7280]">
                      <th className="pb-3">Product</th>
                      <th className="pb-3">Stock</th>
                      <th className="pb-3">Buy Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storeLoading ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-sm text-[#6B7280]">
                          Loading...
                        </td>
                      </tr>
                    ) : unpaidInventory.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-sm text-[#6B7280]">
                          No unpaid products for this store.
                        </td>
                      </tr>
                    ) : (
                      unpaidInventory.map((item) => (
                        <tr key={item.id} className="border-t border-[#D1FAE5]">
                          <td className="py-3 font-medium">
                            {productMap[item.product_id] || `Product ${item.product_id}`}
                          </td>
                          <td className="py-3 text-[#6B7280]">{item.quantity_in_stock}</td>
                          <td className="py-3 text-[#6B7280]">{formatCurrency(item.buying_price)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </PageShell>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-[#D1FAE5] bg-white p-2">
      <p className="text-[10px] text-[#6B7280]">{label}</p>
      <p className="mt-1 text-xs font-semibold text-[#064E3B]">{value}</p>
    </div>
  );
}
