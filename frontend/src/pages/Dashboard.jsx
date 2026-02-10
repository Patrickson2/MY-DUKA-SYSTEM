/**
 * Clerk dashboard page.
 * Provides inventory recording, supply requesting, and review of clerk-owned records.
 */
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  AlertTriangle,
  Box,
  Loader2,
  PackagePlus,
  Pencil,
  Send,
  Trash2,
  TrendingUp,
} from "lucide-react";
import PageShell from "../components/PageShell";
import {
  getStoredUser,
  inventoryApi,
  productsApi,
  reportApi,
  supplyRequestsApi,
} from "../services/api";

const EMPTY_DATA = {
  stats: {
    total_products: 0,
    total_stock: 0,
    spoilt_items: 0,
  },
  products: [],
};

const PAGE_SIZE = 6;

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
  const location = useLocation();
  const currentUser = useMemo(() => getStoredUser(), []);
  const [activeForm, setActiveForm] = useState("record");
  const [dashboard, setDashboard] = useState(EMPTY_DATA);
  const [products, setProducts] = useState([]);
  const [stores, setStores] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [secondaryLoading, setSecondaryLoading] = useState(false);
  const [secondaryLoaded, setSecondaryLoaded] = useState(false);
  const [secondaryError, setSecondaryError] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingInventoryId, setEditingInventoryId] = useState(null);
  const [activeSection, setActiveSection] = useState("requests");
  const [recordForm, setRecordForm] = useState({
    product_name: "",
    category: "",
    quantity_received: "",
    quantity_in_stock: "",
    quantity_spoilt: "0",
    buying_price: "",
    selling_price: "",
    payment_status: "unpaid",
    remarks: "",
  });
  const [supplyForm, setSupplyForm] = useState({
    product_id: "",
    quantity_requested: "",
    reason: "",
  });

  const resolvedStoreId = useMemo(() => {
    if (currentUser?.store_id) {
      return currentUser.store_id;
    }
    return stores[0]?.id ?? null;
  }, [currentUser, stores]);

  const filteredProducts = useMemo(() => {
    const value = searchTerm.trim().toLowerCase();
    if (!value) return dashboard.products;
    return dashboard.products.filter((item) => item.product.toLowerCase().includes(value));
  }, [dashboard.products, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const pagedProducts = filteredProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const requestIsLoading = secondaryLoading && !secondaryLoaded;
  const requestHasProducts = products.length > 0;

  const loadBase = async () => {
    const overviewRes = await reportApi.clerkOverview(true);
    const overview = overviewRes?.data || {};

    setDashboard({
      stats: overview.stats || EMPTY_DATA.stats,
      products: overview.inventory || [],
    });

    if (!secondaryLoaded) {
      setProducts(overview.products || []);
      setStores(overview.stores || []);
      setMyRequests(overview.supply_requests || []);
    }
  };

  const loadSecondary = async (force = false) => {
    if (secondaryLoading) return;
    if (secondaryLoaded && !force) return;
    setSecondaryLoading(true);
    setSecondaryError("");
    try {
      const overviewRes = await reportApi.clerkOverview(false);
      const overview = overviewRes?.data || {};

      setDashboard({
        stats: overview.stats || EMPTY_DATA.stats,
        products: overview.inventory || [],
      });
      setProducts(overview.products || []);
      setStores(overview.stores || []);
      setMyRequests(overview.supply_requests || []);
      setSecondaryLoaded(true);
    } catch (requestError) {
      const detail = requestError?.response?.data?.detail;
      setSecondaryError(typeof detail === "string" ? detail : "Failed to load supporting data.");
    } finally {
      setSecondaryLoading(false);
    }
  };

  const scheduleSecondaryLoad = () => {
    if (secondaryLoaded || secondaryLoading) return;
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      window.requestIdleCallback(() => {
        loadSecondary();
      });
    } else {
      window.setTimeout(() => {
        loadSecondary();
      }, 200);
    }
  };

  const loadData = async ({ refreshSecondary = false } = {}) => {
    await loadBase();
    if (secondaryLoaded || refreshSecondary) {
      await loadSecondary(true);
    }
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        await loadData();
        if (active) {
          scheduleSecondaryLoad();
        }
      } catch (requestError) {
        if (!active) return;
        const detail = requestError?.response?.data?.detail;
        setError(typeof detail === "string" ? detail : "Failed to load clerk dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (activeForm === "request") {
      scheduleSecondaryLoad();
    }
  }, [activeForm]);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab === "requests") {
      setActiveSection("requests");
      setActiveForm("request");
    }
    if (tab === "records") {
      setActiveSection("records");
      setActiveForm("record");
    }
  }, [location.search]);

  const setTemporaryMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2500);
  };

  const validateRecordForm = () => {
    const buy = Number(recordForm.buying_price);
    const sell = Number(recordForm.selling_price);
    const inStock = Number(recordForm.quantity_in_stock);
    const received = Number(recordForm.quantity_received);
    const spoilt = Number(recordForm.quantity_spoilt || 0);

    if (!recordForm.product_name.trim()) return "Please enter a product name.";
    if (received < 0 || inStock < 0 || spoilt < 0) return "Quantities cannot be negative.";
    if (inStock + spoilt > received) {
      return "Current stock plus spoilt items cannot exceed quantity received.";
    }
    if (buy <= 0 || sell <= 0) return "Prices must be greater than zero.";
    if (sell < buy) return "Selling price must be greater than or equal to buying price.";
    return "";
  };

  const resetRecordForm = () => {
    setEditingInventoryId(null);
    setRecordForm({
      product_name: "",
      category: "",
      quantity_received: "",
      quantity_in_stock: "",
      quantity_spoilt: "0",
      buying_price: "",
      selling_price: "",
      payment_status: "unpaid",
      remarks: "",
    });
  };

  const handleRecordSubmit = async (event) => {
    event.preventDefault();
    if (!resolvedStoreId) {
      setError("No store is assigned. Ask admin to assign a store first.");
      return;
    }

    const validationMessage = validateRecordForm();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setBusy(true);
    setError("");
    try {
      // Create product on-demand if the typed product does not exist yet.
      let productId = products.find(
        (product) =>
          product.name.trim().toLowerCase() === recordForm.product_name.trim().toLowerCase()
      )?.id;

      if (!productId) {
        const generatedSku = `${recordForm.product_name
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")}-${Date.now().toString().slice(-6)}`;
        const createProductResponse = await productsApi.create({
          name: recordForm.product_name.trim(),
          description: recordForm.category.trim() || null,
          sku: generatedSku,
          buying_price: Number(recordForm.buying_price),
          selling_price: Number(recordForm.selling_price),
        });
        const createdProduct = createProductResponse.data;
        productId = createdProduct.id;
        setProducts((prev) => {
          if (!createdProduct?.id) return prev;
          if (prev.some((item) => item.id === createdProduct.id)) return prev;
          return [...prev, createdProduct];
        });
      }

      const payload = {
        product_id: Number(productId),
        store_id: Number(resolvedStoreId),
        quantity_received: Number(recordForm.quantity_received),
        quantity_in_stock: Number(recordForm.quantity_in_stock),
        quantity_spoilt: Number(recordForm.quantity_spoilt || 0),
        buying_price: Number(recordForm.buying_price),
        selling_price: Number(recordForm.selling_price),
        payment_status: recordForm.payment_status,
        remarks: recordForm.remarks,
      };

      const wasEditing = Boolean(editingInventoryId);
      if (wasEditing) {
        await inventoryApi.update(editingInventoryId, {
          quantity_in_stock: payload.quantity_in_stock,
          quantity_spoilt: payload.quantity_spoilt,
          payment_status: payload.payment_status,
          remarks: payload.remarks,
        });
      } else {
        await inventoryApi.create(payload);
      }

      resetRecordForm();
      await loadData();
      setTemporaryMessage(wasEditing ? "Inventory updated successfully." : "Inventory recorded successfully.");
    } catch (requestError) {
      const detail = requestError?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to save inventory.");
    } finally {
      setBusy(false);
    }
  };

  const handleEditInventory = (item) => {
    // Populate form from selected row for inline edit flow.
    setEditingInventoryId(item.inventory_id);
    setActiveForm("record");
    setRecordForm({
      product_name: item.product,
      category: item.category || "",
      quantity_received: String(item.stock),
      quantity_in_stock: String(item.stock),
      quantity_spoilt: String(item.spoil),
      buying_price: String(item.buy_price),
      selling_price: String(item.sell_price),
      payment_status: item.payment_status.toLowerCase(),
      remarks: "",
    });
  };

  const handleDeleteInventory = async (inventoryId) => {
    setBusy(true);
    setError("");
    try {
      await inventoryApi.remove(inventoryId);
      await loadData();
      setTemporaryMessage("Inventory record deleted.");
    } catch (requestError) {
      const detail = requestError?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to delete inventory.");
    } finally {
      setBusy(false);
    }
  };

  const handleSupplySubmit = async (event) => {
    event.preventDefault();
    if (!resolvedStoreId) {
      setError("No store is assigned. Ask admin to assign a store first.");
      return;
    }
    if (!supplyForm.product_id || Number(supplyForm.quantity_requested) <= 0) {
      setError("Select product and provide a valid quantity needed.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      await supplyRequestsApi.create({
        product_id: Number(supplyForm.product_id),
        store_id: Number(resolvedStoreId),
        quantity_requested: Number(supplyForm.quantity_requested),
        reason: supplyForm.reason,
      });
      setSupplyForm({ product_id: "", quantity_requested: "", reason: "" });
      await loadData({ refreshSecondary: true });
      setTemporaryMessage("Supply request submitted.");
    } catch (requestError) {
      const detail = requestError?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to submit supply request.");
    } finally {
      setBusy(false);
    }
  };

  const stats = [
    {
      label: "Total Products",
      value: dashboard.stats.total_products,
      icon: <Box className="h-5 w-5" />,
      color: "text-[#15803D]",
    },
    {
      label: "Total Stock",
      value: dashboard.stats.total_stock,
      icon: <TrendingUp className="h-5 w-5" />,
      color: "text-[#15803D]",
    },
    {
      label: "Spoilt Items",
      value: dashboard.stats.spoilt_items,
      icon: <AlertTriangle className="h-5 w-5" />,
      color: "text-[#DC2626]",
    },
  ];

  return (
    <PageShell title="Clerk Dashboard" subtitle="Record stock and request supply.">
        {loading ? (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-[#D1FAE5] bg-white px-4 py-3 text-sm text-[#6B7280]">
            <Loader2 className="h-4 w-4 animate-spin text-[#34D399]" />
            Loading clerk dashboard...
          </div>
        ) : null}
        {error ? (
          <div className="mb-6 rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="mb-6 rounded-xl border border-[#D1FAE5] bg-[#D1FAE5] px-4 py-3 text-sm text-[#15803D]">
            {message}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-[#D1FAE5] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#6B7280]">{stat.label}</p>
                <span className={`rounded-lg bg-[#D1FAE5] p-2 ${stat.color}`}>{stat.icon}</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-[#064E3B]">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <button
            onClick={() => setActiveForm("record")}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              activeForm === "record"
                ? "bg-[#15803D] text-white"
                : "bg-[#D1FAE5] text-[#6B7280] hover:bg-[#D1FAE5]"
            }`}
          >
            <PackagePlus className="h-4 w-4" />
            Record New Product
          </button>
          <button
            onClick={() => setActiveForm("request")}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              activeForm === "request"
                ? "bg-[#15803D] text-white"
                : "bg-[#D1FAE5] text-[#6B7280] hover:bg-[#D1FAE5]"
            }`}
          >
            <Send className="h-4 w-4" />
            Request Supply
          </button>
        </div>

        <div className="mt-6 rounded-xl border border-[#D1FAE5] bg-white p-6">
          {activeForm === "record" ? (
            <form onSubmit={handleRecordSubmit} className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <FieldLabel label="Product">
                <input
                  placeholder="e.g. Rice - 5kg"
                  value={recordForm.product_name}
                  onChange={(e) => setRecordForm((prev) => ({ ...prev, product_name: e.target.value }))}
                  className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2 text-sm"
                  required
                />
              </FieldLabel>
              <FieldLabel label="Category">
                <input
                  placeholder="e.g. Grains"
                  value={recordForm.category}
                  onChange={(e) => setRecordForm((prev) => ({ ...prev, category: e.target.value }))}
                  className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2 text-sm"
                />
              </FieldLabel>
              <FieldLabel label="Quantity Received">
                <input
                  placeholder="e.g. 100"
                  type="number"
                  min="0"
                  value={recordForm.quantity_received}
                  onChange={(e) => setRecordForm((prev) => ({ ...prev, quantity_received: e.target.value }))}
                  className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2 text-sm"
                  required
                />
              </FieldLabel>
              <FieldLabel label="Current Stock">
                <input
                  placeholder="e.g. 80"
                  type="number"
                  min="0"
                  value={recordForm.quantity_in_stock}
                  onChange={(e) => setRecordForm((prev) => ({ ...prev, quantity_in_stock: e.target.value }))}
                  className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2 text-sm"
                  required
                />
              </FieldLabel>
              <FieldLabel label="Spoilt Items">
                <input
                  placeholder="e.g. 2"
                  type="number"
                  min="0"
                  value={recordForm.quantity_spoilt}
                  onChange={(e) => setRecordForm((prev) => ({ ...prev, quantity_spoilt: e.target.value }))}
                  className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2 text-sm"
                />
              </FieldLabel>
              <FieldLabel label="Buying Price">
                <input
                  placeholder="e.g. 450"
                  type="number"
                  min="1"
                  value={recordForm.buying_price}
                  onChange={(e) => setRecordForm((prev) => ({ ...prev, buying_price: e.target.value }))}
                  className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2 text-sm"
                  required
                />
              </FieldLabel>
              <FieldLabel label="Selling Price">
                <input
                  placeholder="e.g. 600"
                  type="number"
                  min="1"
                  value={recordForm.selling_price}
                  onChange={(e) => setRecordForm((prev) => ({ ...prev, selling_price: e.target.value }))}
                  className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2 text-sm"
                  required
                />
              </FieldLabel>
              <FieldLabel label="Payment Status">
                <select
                  value={recordForm.payment_status}
                  onChange={(e) => setRecordForm((prev) => ({ ...prev, payment_status: e.target.value }))}
                  className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2 text-sm"
                >
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </FieldLabel>
              <FieldLabel label="Remarks" className="md:col-span-2">
                <input
                  placeholder="Any note for this inventory entry"
                  value={recordForm.remarks}
                  onChange={(e) => setRecordForm((prev) => ({ ...prev, remarks: e.target.value }))}
                  className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2 text-sm"
                />
              </FieldLabel>
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-[#15803D] px-4 py-2 text-sm font-semibold text-white"
              >
                {busy ? "Saving..." : editingInventoryId ? "Update Inventory" : "Record Inventory"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSupplySubmit} className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {requestIsLoading ? (
                <div className="md:col-span-3 flex items-center gap-2 rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2 text-xs text-[#6B7280]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#34D399]" />
                  Loading products and recent requests...
                </div>
              ) : null}
              {secondaryError ? (
                <div className="md:col-span-3 rounded-lg border border-[#DC2626]/30 bg-[#DC2626]/10 px-3 py-2 text-xs text-[#DC2626]">
                  {secondaryError}
                </div>
              ) : null}
              {!requestIsLoading && !requestHasProducts ? (
                <div className="md:col-span-3 rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2 text-xs text-[#6B7280]">
                  No products available yet. Record inventory first or ask admin to add products.
                </div>
              ) : null}
              <FieldLabel label="Product">
                <select
                  value={supplyForm.product_id}
                  onChange={(e) => setSupplyForm((prev) => ({ ...prev, product_id: e.target.value }))}
                  disabled={requestIsLoading || !requestHasProducts}
                  className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2 text-sm"
                  required
                >
                  <option value="">
                    {requestIsLoading
                      ? "Loading products..."
                      : requestHasProducts
                      ? "Select product"
                      : "No products available"}
                  </option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </FieldLabel>
              <FieldLabel label="Quantity Needed">
                <input
                  placeholder="e.g. 50"
                  type="number"
                  min="1"
                  value={supplyForm.quantity_requested}
                  onChange={(e) => setSupplyForm((prev) => ({ ...prev, quantity_requested: e.target.value }))}
                  className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2 text-sm"
                  required
                />
              </FieldLabel>
              <FieldLabel label="Reason">
                <input
                  placeholder="Why restock is needed"
                  value={supplyForm.reason}
                  onChange={(e) => setSupplyForm((prev) => ({ ...prev, reason: e.target.value }))}
                  className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2 text-sm"
                  required
                />
              </FieldLabel>
              <button
                type="submit"
                disabled={busy || requestIsLoading || !requestHasProducts}
                className="rounded-lg bg-[#15803D] px-4 py-2 text-sm font-semibold text-white md:col-span-3"
              >
                {busy ? "Submitting..." : "Submit Supply Request"}
              </button>
            </form>
          )}
        </div>

        <div className="mt-8 rounded-xl border border-[#D1FAE5] bg-white p-3 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "requests", label: "My Requests" },
              { id: "records", label: "My Recorded Products" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  activeSection === tab.id
                    ? "bg-[#D1FAE5] text-[#064E3B]"
                    : "text-[#6B7280] hover:bg-[#F0FDF4]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeSection === "requests" ? (
        <section className="mt-4 rounded-xl border border-[#D1FAE5] bg-white shadow-sm">
          <div className="border-b border-[#D1FAE5] px-6 py-4">
            <h2 className="text-base font-semibold text-[#064E3B]">My Supply Requests</h2>
          </div>
          <div className="overflow-x-auto px-6 py-4">
            {requestIsLoading && myRequests.length === 0 ? (
              <p className="text-sm text-[#6B7280]">Loading supply requests...</p>
            ) : myRequests.length === 0 ? (
              <p className="text-sm text-[#6B7280]">No supply requests submitted yet.</p>
            ) : (
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-[#6B7280]">
                    <th className="py-2">Request ID</th>
                    <th className="py-2">Product ID</th>
                    <th className="py-2">Quantity</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {myRequests.slice(0, 5).map((request) => (
                    <tr key={request.id} className="border-t border-[#D1FAE5]">
                      <td className="py-2">#{request.id}</td>
                      <td className="py-2">{request.product_id}</td>
                      <td className="py-2">{request.quantity_requested}</td>
                      <td className="py-2">
                        <StatusBadge status={request.status?.charAt(0).toUpperCase() + request.status?.slice(1)} />
                      </td>
                      <td className="py-2 text-[#6B7280]">{request.admin_notes || request.reason || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
        ) : null}

        {activeSection === "records" ? (
        <section className="mt-4 rounded-xl border border-[#D1FAE5] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#D1FAE5] px-6 py-4">
            <h2 className="text-base font-semibold text-[#064E3B]">My Recorded Products</h2>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search product"
              className="w-56 rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-1.5 text-xs"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-[#6B7280]">
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Stock</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Spoilt</th>
                  <th className="px-6 py-3">Buy Price</th>
                  <th className="px-6 py-3">Sell Price</th>
                  <th className="px-6 py-3">Payment</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedProducts.length === 0 ? (
                  <tr>
                    <td className="px-6 py-6 text-[#6B7280]" colSpan={9}>
                      No recorded inventory yet.
                    </td>
                  </tr>
                ) : (
                  pagedProducts.map((item) => (
                    <tr key={item.inventory_id} className="border-t border-[#D1FAE5]">
                      <td className="px-6 py-4 font-medium text-[#064E3B]">{item.product}</td>
                      <td className="px-6 py-4 text-[#6B7280]">{item.category || "-"}</td>
                      <td className="px-6 py-4 text-[#064E3B]">{item.stock}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={getInventoryStatus(item.stock)} />
                      </td>
                      <td className="px-6 py-4 text-[#064E3B]">{item.spoil}</td>
                      <td className="px-6 py-4 text-[#064E3B]">{formatCurrency(item.buy_price)}</td>
                      <td className="px-6 py-4 text-[#064E3B]">{formatCurrency(item.sell_price)}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={item.payment_status} />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditInventory(item)}
                            className="rounded bg-[#D1FAE5] p-1.5 text-[#15803D]"
                            aria-label="Edit inventory"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteInventory(item.inventory_id)}
                            className="rounded bg-[#DC2626]/10 p-1.5 text-[#DC2626]"
                            aria-label="Delete inventory"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-[#D1FAE5] px-6 py-3 text-xs text-[#6B7280]">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="rounded border border-[#D1FAE5] px-2 py-1 disabled:opacity-40"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="rounded border border-[#D1FAE5] px-2 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>
        ) : null}
    </PageShell>
  );
}

function FieldLabel({ label, className = "", children }) {
  return (
    <label className={`flex flex-col gap-1 text-xs text-[#6B7280] ${className}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function StatusBadge({ status }) {
  const styles = {
    "In Stock": "bg-[#D1FAE5] text-[#15803D]",
    "Low Stock": "bg-[#DC2626]/10 text-[#DC2626]",
    "Out of Stock": "bg-[#DC2626]/10 text-[#DC2626]",
    Paid: "bg-[#D1FAE5] text-[#15803D]",
    Unpaid: "bg-[#DC2626]/10 text-[#DC2626]",
    Pending: "bg-[#D1FAE5] text-[#6B7280]",
    Approved: "bg-[#D1FAE5] text-[#15803D]",
    Declined: "bg-[#DC2626]/10 text-[#DC2626]",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status] || "bg-[#D1FAE5] text-[#6B7280]"}`}>
      {status}
    </span>
  );
}
