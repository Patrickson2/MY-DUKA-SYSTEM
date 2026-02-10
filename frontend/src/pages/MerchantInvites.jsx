/**
 * Merchant invite management page.
 * Provides admin invite link generation for merchants.
 */
import { useEffect, useState } from "react";
import { Loader2, MailPlus } from "lucide-react";
import PageShell from "../components/PageShell";
import { storesApi, usersApi } from "../services/api";

const initialForm = { email: "", store_id: "" };

export default function MerchantInvites() {
  const [stores, setStores] = useState([]);
  const [inviteForm, setInviteForm] = useState(initialForm);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const setTemporaryMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 2500);
  };

  const loadStores = async () => {
    const response = await storesApi.list({ active_only: true, limit: 200 });
    setStores(response.data);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        await loadStores();
      } catch (requestError) {
        if (!active) return;
        const detail = requestError?.response?.data?.detail;
        setError(typeof detail === "string" ? detail : "Failed to load stores.");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const handleInviteAdmin = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        email: inviteForm.email,
        store_id: inviteForm.store_id ? Number(inviteForm.store_id) : null,
      };
      const response = await usersApi.createAdminInvite(payload);
      setInviteForm(initialForm);
      setTemporaryMessage("Invite sent to admin email.");
    } catch (requestError) {
      const detail = requestError?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to create admin invite.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell title="Admin Invites" subtitle="Generate tokenized onboarding links for store admins.">
      <section className="rounded-2xl border border-[#D1FAE5] bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#064E3B]">Invite a store admin</h2>
            <p className="mt-1 text-sm text-[#6B7280]">
              Send a secure link that expires after the configured period.
            </p>
          </div>
          {loading ? (
            <div className="inline-flex items-center gap-2 text-sm text-[#6B7280]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading stores...
            </div>
          ) : null}
        </div>

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

        <form onSubmit={handleInviteAdmin} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm text-[#6B7280]">
            Admin email
            <input
              type="email"
              placeholder="new-admin@myduka.com"
              className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2.5 text-base text-[#064E3B]"
              value={inviteForm.email}
              onChange={(event) => setInviteForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-[#6B7280]">
            Assign store (optional)
            <select
              value={inviteForm.store_id}
              onChange={(event) => setInviteForm((prev) => ({ ...prev, store_id: event.target.value }))}
              className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2.5 text-base text-[#064E3B]"
            >
              <option value="">Select store</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#15803D] px-4 py-2.5 text-base font-semibold text-white disabled:opacity-60"
            >
              <MailPlus className="h-5 w-5" />
              {busy ? "Sending..." : "Send invite"}
            </button>
          </div>
        </form>
      </section>


    </PageShell>
  );
}
