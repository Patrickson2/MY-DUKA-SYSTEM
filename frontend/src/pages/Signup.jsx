/**
 * Merchant signup page.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, User } from "lucide-react";
import { authApi, getDashboardRoute, saveAuthSession } from "../services/api";

export default function Signup() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const response = await authApi.registerMerchant({
        email: email.trim(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        password,
      });
      const { access_token: accessToken, refresh_token: refreshToken, user } = response.data;
      saveAuthSession(accessToken, user, refreshToken);
      navigate(getDashboardRoute(user?.role), { replace: true });
    } catch (requestError) {
      const detail = requestError?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Signup failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0FDF4] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-[#D1FAE5] bg-white p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-[#064E3B]">Create Merchant Account</h1>
        <p className="mt-2 text-sm text-[#6B7280]">
          Only merchants can sign up. Admins and clerks are added by invites.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-[#6B7280]">
              First name
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="w-full rounded-xl border border-[#D1FAE5] bg-[#FFFFFF] px-4 py-2.5 text-sm text-[#064E3B] placeholder-[#6B7280] focus:border-[#34D399] focus:outline-none focus:ring-2 focus:ring-[#34D399]/30"
                placeholder="Jane"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-[#6B7280]">
              Last name
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="w-full rounded-xl border border-[#D1FAE5] bg-[#FFFFFF] px-4 py-2.5 text-sm text-[#064E3B] placeholder-[#6B7280] focus:border-[#34D399] focus:outline-none focus:ring-2 focus:ring-[#34D399]/30"
                placeholder="Doe"
                required
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm text-[#6B7280]">
            <span className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-[#D1FAE5] bg-[#FFFFFF] px-4 py-2.5 text-sm text-[#064E3B] placeholder-[#6B7280] focus:border-[#34D399] focus:outline-none focus:ring-2 focus:ring-[#34D399]/30"
              placeholder="merchant@myduka.com"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-[#6B7280]">
            <span className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Password
            </span>
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
          </label>
          {error ? (
            <div className="rounded-xl border border-[#DC2626]/30 bg-[#DC2626]/10 px-4 py-3 text-sm text-[#DC2626]">
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[#15803D] py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#15803D]/20 hover:shadow-[#15803D]/30 transition-all"
          >
            {busy ? "Creating..." : "Create merchant account"}
          </button>
        </form>
        <div className="mt-4 text-sm text-[#6B7280]">
          Already have an account?{" "}
          <Link to="/login" className="text-[#34D399] hover:text-[#34D399]">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
