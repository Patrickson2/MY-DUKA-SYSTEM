/**
 * Forgot password page.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import { authApi } from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await authApi.forgotPassword(email.trim());
      setMessage("If the email exists, a reset link has been sent.");
    } catch (requestError) {
      const detail = requestError?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to request reset link.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0FDF4] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-[#D1FAE5] bg-white p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-[#064E3B]">Forgot Password</h1>
        <p className="mt-2 text-sm text-[#6B7280]">
          Enter your email and we&apos;ll send you a reset link.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[#6B7280]">
              <Mail className="h-4 w-4 text-[#6B7280]" />
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-[#D1FAE5] bg-[#FFFFFF] px-4 py-2.5 text-sm text-[#064E3B] placeholder-[#6B7280] focus:border-[#34D399] focus:outline-none focus:ring-2 focus:ring-[#34D399]/30"
              required
            />
          </div>
          {error ? (
            <div className="rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">
              {error}
            </div>
          ) : null}
          {message ? (
            <div className="rounded-xl border border-[#D1FAE5] bg-[#D1FAE5] px-4 py-3 text-sm text-[#15803D]">
              {message}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[#15803D] py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#15803D]/20 hover:shadow-[#15803D]/30 transition-all"
          >
            {busy ? "Sending..." : "Send reset link"}
          </button>
        </form>
        <div className="mt-4 text-sm text-[#6B7280]">
          Remembered your password?{" "}
          <Link to="/login" className="text-[#34D399] hover:text-[#34D399]">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
