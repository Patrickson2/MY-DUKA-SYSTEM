/**
 * Merchant store management page.
 * Allows merchants to add and delete stores.
 */
import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import PageShell from "../components/PageShell";
import { storesApi } from "../services/api";

const initialStoreForm = {
  name: "",
  location: "",
  description: "",
  phone: "",
  email: "",
};

export default function MerchantStores() {
  const [stores, setStores] = useState([]);
  const [storeForm, setStoreForm] = useState(initialStoreForm);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadStores = async () => {
    const res = await storesApi.list({ active_only: false, limit: 200 });
    setStores(res.data);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        await loadStores();
      } catch {
        if (active) setError("Failed to load stores.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const handleCreateStore = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        name: storeForm.name.trim(),
        location: storeForm.location.trim(),
        description: storeForm.description.trim() || undefined,
        phone: storeForm.phone.trim() || undefined,
        email: storeForm.email.trim() || undefined,
      };
      await storesApi.create(payload);
      setStoreForm(initialStoreForm);
      await loadStores();
      setMessage("Store created successfully.");
      window.setTimeout(() => setMessage(""), 2500);
    } catch (requestError) {
      const detail = requestError?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to create store.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteStore = async (store) => {
    if (!window.confirm(`Delete "${store.name}"? This cannot be undone.`)) return;
    setBusyId(store.id);
    setError("");
    try {
      await storesApi.remove(store.id);
      await loadStores();
      setMessage("Store deleted.");
      window.setTimeout(() => setMessage(""), 2500);
    } catch (requestError) {
      const detail = requestError?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to delete store.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <PageShell title="Add Store" subtitle="Create new store locations for your business.">
      <section className="rounded-2xl border border-[#D1FAE5] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#064E3B]">Store details</h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          Provide store information so it can be assigned to admins and inventory activity.
        </p>

        {error ? (
          <div className="mt-4 rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="mt-4 rounded-xl border border-[#D1FAE5] bg-[#F0FDF4] px-4 py-3 text-sm text-[#15803D]">
            {message}
          </div>
        ) : null}

        <form onSubmit={handleCreateStore} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-[#6B7280]">
            Store name
            <input
              value={storeForm.name}
              onChange={(event) => setStoreForm((prev) => ({ ...prev, name: event.target.value }))}
              className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2.5 text-base text-[#064E3B]"
              placeholder="MyDuka Central"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-[#6B7280]">
            Location
            <input
              value={storeForm.location}
              onChange={(event) => setStoreForm((prev) => ({ ...prev, location: event.target.value }))}
              className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2.5 text-base text-[#064E3B]"
              placeholder="Nairobi"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-[#6B7280] md:col-span-2">
            Description (optional)
            <input
              value={storeForm.description}
              onChange={(event) => setStoreForm((prev) => ({ ...prev, description: event.target.value }))}
              className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2.5 text-base text-[#064E3B]"
              placeholder="Main outlet in CBD"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-[#6B7280]">
            Phone (optional)
            <input
              value={storeForm.phone}
              onChange={(event) => setStoreForm((prev) => ({ ...prev, phone: event.target.value }))}
              className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2.5 text-base text-[#064E3B]"
              placeholder="+254700000111"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-[#6B7280]">
            Email (optional)
            <input
              type="email"
              value={storeForm.email}
              onChange={(event) => setStoreForm((prev) => ({ ...prev, email: event.target.value }))}
              className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2.5 text-base text-[#064E3B]"
              placeholder="store@myduka.com"
            />
          </label>
          <div className="flex items-end md:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center rounded-lg bg-[#15803D] px-4 py-2.5 text-base font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Saving..." : "Create store"}
            </button>
          </div>
        </form>
      </section>

      <section className="mt-8 rounded-2xl border border-[#D1FAE5] bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#064E3B]">Your stores</h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          Manage store locations. Deleting a store is permanent.
        </p>
        {loading ? (
          <p className="mt-4 text-sm text-[#6B7280]">Loading stores...</p>
        ) : stores.length === 0 ? (
          <p className="mt-4 text-sm text-[#6B7280]">No stores yet. Create one above.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-[#6B7280]">
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Location</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stores.map((store) => (
                  <tr key={store.id} className="border-t border-[#D1FAE5]">
                    <td className="py-3 font-medium">{store.name}</td>
                    <td className="py-3 text-[#6B7280]">{store.location}</td>
                    <td className="py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          store.is_active ? "bg-[#D1FAE5] text-[#15803D]" : "bg-[#DC2626]/10 text-[#DC2626]"
                        }`}
                      >
                        {store.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="py-3">
                      <button
                        type="button"
                        onClick={() => handleDeleteStore(store)}
                        disabled={busyId === store.id}
                        className="inline-flex items-center gap-1.5 rounded bg-[#DC2626]/10 px-2.5 py-1.5 text-xs font-medium text-[#DC2626] hover:bg-[#DC2626]/20 disabled:opacity-50"
                        aria-label={`Delete ${store.name}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PageShell>
  );
}
