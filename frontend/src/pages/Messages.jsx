/**
 * Messages page for sending notifications.
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2, Send } from "lucide-react";
import PageShell from "../components/PageShell";
import { getStoredUser, messagesApi, normalizeRole } from "../services/api";

export default function Messages() {
  const currentUser = useMemo(() => getStoredUser(), []);
  const role = normalizeRole(currentUser?.role);
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ recipient_id: "", message: "" });

  const loadRecipients = async () => {
    const response = await messagesApi.recipients();
    setRecipients(response.data || []);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);
        setError("");
        await loadRecipients();
      } catch (requestError) {
        if (!active) return;
        const detail = requestError?.response?.data?.detail;
        setError(typeof detail === "string" ? detail : "Failed to load recipients.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.recipient_id || !form.message.trim()) {
      setError("Select a recipient and write your message.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await messagesApi.send({
        recipient_id: Number(form.recipient_id),
        message: form.message.trim(),
      });
      setForm({ recipient_id: "", message: "" });
      setMessage("Message sent.");
      window.setTimeout(() => setMessage(""), 2500);
    } catch (requestError) {
      const detail = requestError?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to send message.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell title="Messages" subtitle="Send updates to your team.">
      {loading ? (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-[#D1FAE5] bg-white px-4 py-3 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-[#34D399]" />
          Loading recipients...
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

      <section className="rounded-xl border border-[#D1FAE5] bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-[#064E3B]">New Message</h2>
        <p className="mt-1 text-sm text-[#6B7280]">
          {role === "merchant"
            ? "You can message store admins."
            : role === "clerk"
            ? "You can message your store admin."
            : "You can message the merchant or your clerks."}
        </p>
        <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-[#6B7280]">
            Recipient
            <select
              value={form.recipient_id}
              onChange={(event) => setForm((prev) => ({ ...prev, recipient_id: event.target.value }))}
              className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2 text-sm text-[#064E3B]"
              required
            >
              <option value="">Select recipient</option>
              {recipients.map((recipient) => (
                <option key={recipient.id} value={recipient.id}>
                  {recipient.name} · {recipient.role}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm text-[#6B7280] md:col-span-2">
            Message
            <textarea
              value={form.message}
              onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
              rows={4}
              className="rounded-lg border border-[#D1FAE5] bg-[#F0FDF4] px-3 py-2 text-sm text-[#064E3B]"
              placeholder="Write your message"
              required
            />
          </label>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-[#15803D] px-4 py-2 text-sm font-semibold text-white"
            >
              <Send className="h-4 w-4" />
              {busy ? "Sending..." : "Send Message"}
            </button>
          </div>
        </form>
      </section>
    </PageShell>
  );
}
