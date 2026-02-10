/**
 * Reset password page.
 */
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Lock } from "lucide-react";
import { authApi } from "../services/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!token) {
      setError("Reset token is missing.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await authApi.resetPassword(token, password);
      setMessage("Password updated. You can now log in.");
    } catch (requestError) {
      const detail = requestError?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to reset password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0FDF4] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-[#D1FAE5] bg-white p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-[#064E3B]">Reset Password</h1>
        <p className="mt-2 text-sm text-[#6B7280]">Choose a new password for your account.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[#6B7280]">
              <Lock className="h-4 w-4 text-[#6B7280]" />
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-[#D1FAE5] bg-[#FFFFFF] py-2.5 pl-4 pr-12 text-sm text-[#064E3B] placeholder-[#6B7280] focus:border-[#34D399] focus:outline-none focus:ring-2 focus:ring-[#34D399]/30"
                placeholder="••••••••"
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#6B7280] hover:text-[#064E3B] transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-[#6B7280]">
              <Lock className="h-4 w-4 text-[#6B7280]" />
              Confirm Password
            </label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className="w-full rounded-xl border border-[#D1FAE5] bg-[#FFFFFF] px-4 py-2.5 text-sm text-[#064E3B] placeholder-[#6B7280] focus:border-[#34D399] focus:outline-none focus:ring-2 focus:ring-[#34D399]/30"
              placeholder="••••••••"
              minLength={8}
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
            {busy ? "Updating..." : "Update password"}
          </button>
        </form>
        <div className="mt-4 text-sm text-[#6B7280]">
          <Link to="/login" className="text-[#34D399] hover:text-[#34D399]">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
