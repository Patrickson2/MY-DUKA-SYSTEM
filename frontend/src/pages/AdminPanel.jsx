/**
 * Store admin dashboard page.
 * Manages clerks, supply request decisions, and supplier payment updates.
 */
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  ClipboardCheck,
  CreditCard,
  Loader2,
  Store,
  UserPlus,
  Users,
} from "lucide-react";
import PageShell from "../components/PageShell";
import { inventoryApi, reportApi, supplyRequestsApi, usersApi } from "../services/api";

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
  clerk_performance: [],
};

const PAGE_SIZE = 6;
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
  const location = useLocation();
  const [dashboard, setDashboard] = useState(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [requestFilter, setRequestFilter] = useState("All");
  const [requestSearch, setRequestSearch] = useState("");
  const [requestNotes, setRequestNotes] = useState({});
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [clerkSearch, setClerkSearch] = useState("");
  const [supplyPage, setSupplyPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const [clerkPage, setClerkPage] = useState(1);
  const [activeTab, setActiveTab] = useState("register");
  const [clerkForm, setClerkForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  });

  const filteredSupply = useMemo(() => {
    const query = requestSearch.trim().toLowerCase();
    return dashboard.supply_requests.filter((item) => {
      const matchesStatus = requestFilter === "All" || item.status === requestFilter;
      const matchesQuery =
        !query ||
        item.product.toLowerCase().includes(query) ||
        item.requested_by.toLowerCase().includes(query);
      return matchesStatus && matchesQuery;
    });
  }, [dashboard.supply_requests, requestFilter, requestSearch]);

  const filteredPayments = useMemo(() => {
    return dashboard.payment_status.filter((item) =>
      paymentFilter === "All" ? true : item.payment_status === paymentFilter
    );
  }, [dashboard.payment_status, paymentFilter]);

  const filteredClerks = useMemo(() => {
    const query = clerkSearch.trim().toLowerCase();
    if (!query) return dashboard.clerks;
    return dashboard.clerks.filter(
      (item) =>
        item.name.toLowerCase().includes(query) || item.email.toLowerCase().includes(query)
    );
  }, [dashboard.clerks, clerkSearch]);

  const supplyPages = Math.max(1, Math.ceil(filteredSupply.length / PAGE_SIZE));
  const paymentPages = Math.max(1, Math.ceil(filteredPayments.length / PAGE_SIZE));
  const clerkPages = Math.max(1, Math.ceil(filteredClerks.length / PAGE_SIZE));

  const pagedSupply = filteredSupply.slice((supplyPage - 1) * PAGE_SIZE, supplyPage * PAGE_SIZE);
  const pagedPayments = filteredPayments.slice((paymentPage - 1) * PAGE_SIZE, paymentPage * PAGE_SIZE);
  const pagedClerks = filteredClerks.slice((clerkPage - 1) * PAGE_SIZE, clerkPage * PAGE_SIZE);

  const loadDashboard = async () => {
    const response = await reportApi.adminDashboard();
    setDashboard(response.data);
  };


  useEffect(() => {
    let active = true;

    (async () => {
      try {
        await loadDashboard();
      } catch (requestError) {
        if (!active) return;
        const detail = requestError?.response?.data?.detail;
        setError(typeof detail === "string" ? detail : "Failed to load admin dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => setSupplyPage(1), [requestFilter, requestSearch]);
  useEffect(() => setPaymentPage(1), [paymentFilter]);
  useEffect(() => setClerkPage(1), [clerkSearch]);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab && ["register", "requests", "payments", "clerks", "performance"].includes(tab)) {
      setActiveTab(tab);
    }
  }, [location.search]);

  const setTemporaryMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2500);
  };

  const handleRequestStatus = async (requestId, action, adminNotes = "") => {
    setBusyId(`request-${requestId}`);
    setError("");
    try {
      if (action === "approve") {
        await supplyRequestsApi.approve(requestId, adminNotes);
      } else {
        await supplyRequestsApi.decline(requestId, adminNotes || "Declined by admin");
      }
      await loadDashboard();
      setRequestNotes((prev) => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
      setTemporaryMessage(`Request ${action}d successfully.`);
    } catch (requestError) {
      const detail = requestError?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : `Failed to ${action} request.`);
    } finally {
      setBusyId(null);
    }
  };

  const handleTogglePayment = async (item) => {
    setBusyId(`payment-${item.inventory_id}`);
    setError("");
    try {
      const nextStatus = item.payment_status.toLowerCase() === "paid" ? "unpaid" : "paid";
      await inventoryApi.updatePaymentStatus(item.inventory_id, nextStatus);
      await loadDashboard();
      setTemporaryMessage("Payment status updated.");
    } catch (requestError) {
      const detail = requestError?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to update payment status.");
    } finally {
      setBusyId(null);
    }
  };

  const handleClerkStatus = async (clerk, isActive) => {
    const nextAction = isActive ? "activate" : "deactivate";
    if (!window.confirm(`Are you sure you want to ${nextAction} ${clerk.name}?`)) {
      return;
    }
    setBusyId(`clerk-${clerk.id}`);
    setError("");
    try {
      await usersApi.setActive(clerk.id, isActive);
      await loadDashboard();
      setTemporaryMessage(`Clerk ${isActive ? "activated" : "deactivated"}.`);
    } catch (requestError) {
      const detail = requestError?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to update clerk status.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteClerk = async (clerk) => {
    if (!window.confirm(`Delete ${clerk.name}? This cannot be undone.`)) {
      return;
    }
    setBusyId(`delete-${clerk.id}`);
    setError("");
    try {
      await usersApi.remove(clerk.id);
      await loadDashboard();
      setTemporaryMessage("Clerk deleted.");
    } catch (requestError) {
      const detail = requestError?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to delete clerk.");
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateClerk = async (event) => {
    event.preventDefault();
    setBusyId("create-clerk");
    setError("");
    try {
      await usersApi.create({ ...clerkForm, role: "clerk" });
      setClerkForm({ first_name: "", last_name: "", email: "", password: "" });
      await loadDashboard();
      setTemporaryMessage("Clerk created successfully.");
    } catch (requestError) {
      const detail = requestError?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to create clerk.");
    } finally {
      setBusyId(null);
    }
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
    <PageShell title="Admin Dashboard" subtitle="Store operations and approvals.">
        {loading ? (
          <div className="flex items-center gap-2 rounded-xl border border-[#D1FAE5] bg-white px-4 py-3 text-sm">
            <Loader2 className="h-4 w-4 animate-spin text-[#34D399]" />
            Loading admin data...
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {statsCards.map((card) => (
            <div key={card.title} className="rounded-xl border border-[#D1FAE5] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#6B7280]">{card.title}</p>
                <span className="rounded-lg bg-[#D1FAE5] p-2 text-[#34D399]">{card.icon}</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-[#064E3B]">{card.value}</p>
              <p className="mt-1 text-xs text-[#6B7280]">{card.trend}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-[#D1FAE5] bg-white p-3 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "register", label: "Register Clerk" },
              { id: "requests", label: "Supply Requests" },
              { id: "payments", label: "Payment Status" },
              { id: "clerks", label: "Clerk Management" },
              { id: "performance", label: "Clerk Performance" },
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
        </div>

        {activeTab === "register" ? (
        <Section title="Register Clerk" subtitle="Create data-entry clerk accounts assigned to your store.">
          <form onSubmit={handleCreateClerk} className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <input
              placeholder="First name"
              value={clerkForm.first_name}
              onChange={(e) => setClerkForm((prev) => ({ ...prev, first_name: e.target.value }))}
              className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2 text-sm"
              required
            />
            <input
              placeholder="Last name"
              value={clerkForm.last_name}
              onChange={(e) => setClerkForm((prev) => ({ ...prev, last_name: e.target.value }))}
              className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2 text-sm"
              required
            />
            <input
              type="email"
              placeholder="clerk@myduka.com"
              value={clerkForm.email}
              onChange={(e) => setClerkForm((prev) => ({ ...prev, email: e.target.value }))}
              className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2 text-sm"
              required
            />
            <input
              placeholder="Password"
              value={clerkForm.password}
              onChange={(e) => setClerkForm((prev) => ({ ...prev, password: e.target.value }))}
              className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2 text-sm"
              minLength={8}
              required
            />
            <button
              type="submit"
              disabled={busyId === "create-clerk"}
              className="md:col-span-4 inline-flex items-center justify-center gap-2 rounded-lg bg-[#15803D] px-4 py-2 text-sm font-semibold text-white"
            >
              <UserPlus className="h-4 w-4" />
              {busyId === "create-clerk" ? "Creating..." : "Create Clerk"}
            </button>
          </form>
        </Section>
        ) : null}

        {activeTab === "requests" ? (
        <Section title="Supply Requests" subtitle="Review and approve stock refill requests.">
          <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              value={requestSearch}
              onChange={(e) => setRequestSearch(e.target.value)}
              placeholder="Search product/clerk"
              className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2 text-xs"
            />
            <select
              value={requestFilter}
              onChange={(e) => setRequestFilter(e.target.value)}
              className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2 text-xs"
            >
              <option>All</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Declined</option>
            </select>
          </div>
          <DataTable
            headers={["Product", "Quantity", "Requested By", "Date", "Notes", "Status", "Actions"]}
            rows={pagedSupply}
            renderRow={(item) => (
              <tr key={item.id} className="border-t border-[#D1FAE5]">
                <td className="py-3">{item.product}</td>
                <td className="py-3">{item.quantity}</td>
                <td className="py-3">{item.requested_by}</td>
                <td className="py-3">{formatDate(item.date)}</td>
                <td className="py-3">{item.notes || "-"}</td>
                <td className="py-3">
                  <StatusBadge status={item.status} />
                </td>
                <td className="py-3">
                  {item.status === "Pending" ? (
                    <div className="flex flex-col gap-2">
                      <input
                        value={requestNotes[item.id] || ""}
                        onChange={(e) =>
                          setRequestNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        placeholder="Admin note (optional)"
                        className="rounded border border-[#D1FAE5] bg-[#F0FDF4] px-2 py-1 text-xs"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleRequestStatus(item.id, "approve", requestNotes[item.id] || "")
                          }
                          disabled={busyId === `request-${item.id}`}
                          className="rounded bg-[#D1FAE5] px-2 py-1 text-xs text-[#15803D]"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            handleRequestStatus(item.id, "decline", requestNotes[item.id] || "")
                          }
                          disabled={busyId === `request-${item.id}`}
                          className="rounded bg-[#DC2626]/10 px-2 py-1 text-xs text-[#DC2626]"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-[#6B7280]">No action</span>
                  )}
                </td>
              </tr>
            )}
            emptyMessage="No supply requests at the moment."
          />
          <Pager page={supplyPage} totalPages={supplyPages} onChange={setSupplyPage} />
        </Section>
        ) : null}

        {activeTab === "payments" ? (
        <Section title="Product Payment Status" subtitle="Track and update supplier payment status.">
          <div className="mb-3 flex gap-3">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2 text-xs"
            >
              <option>All</option>
              <option>Paid</option>
              <option>Unpaid</option>
            </select>
          </div>
          <DataTable
            headers={["Product", "Stock", "Buy Price", "Payment Status", "Actions"]}
            rows={pagedPayments}
            renderRow={(item) => (
              <tr key={item.inventory_id} className="border-t border-[#D1FAE5]">
                <td className="py-3">{item.product}</td>
                <td className="py-3">{item.stock}</td>
                <td className="py-3">{formatCurrency(item.buy_price)}</td>
                <td className="py-3">
                  <StatusBadge status={item.payment_status} />
                </td>
                <td className="py-3">
                  <button
                    onClick={() => handleTogglePayment(item)}
                    disabled={busyId === `payment-${item.inventory_id}`}
                    className="rounded bg-[#D1FAE5] px-2 py-1 text-xs text-[#15803D]"
                  >
                    Toggle Status
                  </button>
                </td>
              </tr>
            )}
            emptyMessage="No inventory payment records yet."
          />
          <Pager page={paymentPage} totalPages={paymentPages} onChange={setPaymentPage} />
        </Section>
        ) : null}

        {activeTab === "clerks" ? (
        <Section title="Clerk Management" subtitle="View assigned clerks and account status.">
          <div className="mb-3">
            <input
              value={clerkSearch}
              onChange={(e) => setClerkSearch(e.target.value)}
              placeholder="Search clerk name or email"
              className="w-full rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2 text-xs md:w-80"
            />
          </div>
          <DataTable
            headers={["Name", "Email", "Joined", "Status", "Actions"]}
            rows={pagedClerks}
            renderRow={(item) => (
              <tr key={item.id} className="border-t border-[#D1FAE5]">
                <td className="py-3">{item.name}</td>
                <td className="py-3 text-[#6B7280]">{item.email}</td>
                <td className="py-3">{formatDate(item.joined_date)}</td>
                <td className="py-3">
                  <StatusBadge status={item.status} />
                </td>
                <td className="py-3">
                  <div className="flex gap-2">
                    {item.status === "Active" ? (
                      <button
                        onClick={() => handleClerkStatus(item, false)}
                        disabled={busyId === `clerk-${item.id}`}
                        className="rounded bg-[#DC2626]/10 px-2 py-1 text-xs text-[#DC2626]"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => handleClerkStatus(item, true)}
                        disabled={busyId === `clerk-${item.id}`}
                        className="rounded bg-[#D1FAE5] px-2 py-1 text-xs text-[#15803D]"
                      >
                        Activate
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteClerk(item)}
                      disabled={busyId === `delete-${item.id}`}
                      className="rounded bg-[#DC2626]/10 px-2 py-1 text-xs text-[#DC2626]"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            )}
            emptyMessage="No clerks found for this admin."
          />
          <Pager page={clerkPage} totalPages={clerkPages} onChange={setClerkPage} />
        </Section>
        ) : null}

        {activeTab === "performance" ? (
        <Section title="Clerk Performance" subtitle="Performance summary for reporting.">
          <DataTable
            headers={["Clerk", "Recorded Entries", "Stock Recorded", "Spoilt Recorded"]}
            rows={dashboard.clerk_performance}
            renderRow={(item) => (
              <tr key={item.clerk_id} className="border-t border-[#D1FAE5]">
                <td className="py-3">{item.name}</td>
                <td className="py-3">{item.recorded_items}</td>
                <td className="py-3">{item.total_stock_recorded}</td>
                <td className="py-3">{item.spoilt_recorded}</td>
              </tr>
            )}
            emptyMessage="No clerk performance data yet."
          />
        </Section>
        ) : null}
    </PageShell>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <section className="mt-8 rounded-xl border border-[#D1FAE5] bg-white p-5">
      <h2 className="text-lg font-semibold text-[#064E3B]">{title}</h2>
      <p className="mt-1 text-sm text-[#6B7280]">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DataTable({ headers, rows, renderRow, emptyMessage }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-[#6B7280]">
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
              <td colSpan={headers.length} className="py-6 text-sm text-[#6B7280]">
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
    Pending: "bg-[#D1FAE5] text-[#6B7280]",
    Approved: "bg-[#D1FAE5] text-[#15803D]",
    Declined: "bg-[#DC2626]/10 text-[#DC2626]",
    Paid: "bg-[#D1FAE5] text-[#15803D]",
    Unpaid: "bg-[#DC2626]/10 text-[#DC2626]",
    Active: "bg-[#D1FAE5] text-[#15803D]",
    Inactive: "bg-[#D1FAE5] text-[#6B7280]",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${palette[status] || "bg-[#D1FAE5] text-[#064E3B]"}`}>
      {status}
    </span>
  );
}

function Pager({ page, totalPages, onChange }) {
  return (
    <div className="mt-3 flex items-center justify-end gap-2 text-xs text-[#6B7280]">
      <button
        onClick={() => onChange((prev) => Math.max(1, prev - 1))}
        disabled={page <= 1}
        className="rounded border border-[#D1FAE5] px-2 py-1 disabled:opacity-40"
      >
        Prev
      </button>
      <span>
        Page {page} of {totalPages}
      </span>
      <button
        onClick={() => onChange((prev) => Math.min(totalPages, prev + 1))}
        disabled={page >= totalPages}
        className="rounded border border-[#D1FAE5] px-2 py-1 disabled:opacity-40"
      >
        Next
      </button>
    </div>
  );
}
