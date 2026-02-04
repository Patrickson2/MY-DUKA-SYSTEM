/**
 * Authentication page.
 * Handles standard sign-in and admin invite completion using invite tokens.
 */
import { useMemo, useState } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authApi, getDashboardRoute, saveAuthSession } from "../services/api";

export default function Login() {
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite_token");
  const isInviteFlow = Boolean(inviteToken);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const roleLabel = useMemo(() => (isInviteFlow ? "Complete Admin Invite" : "Sign In"), [isInviteFlow]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = isInviteFlow
        ? await authApi.registerAdminFromInvite({
            invite_token: inviteToken,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            password,
          })
        : await authApi.login(email.trim(), password);
      const { access_token: accessToken, refresh_token: refreshToken, user } = response.data;
      saveAuthSession(accessToken, user, refreshToken);
      navigate(getDashboardRoute(user?.role), { replace: true });
    } catch (requestError) {
      const detail = requestError?.response?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : "Login failed. Check your credentials and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] relative overflow-hidden">
      {/* Glowing orbs */}
      <div className="absolute top-16 left-16 w-72 h-72 bg-[#1E293B]/70 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-16 right-20 w-96 h-96 bg-[#1E293B]/70 rounded-full blur-3xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-[#1E293B]/50 rounded-full blur-3xl animate-pulse delay-500"></div>
      
      <div className="mx-auto flex min-h-screen max-w-7xl items-center gap-16 px-12 py-12 relative z-10">
        {/* LEFT: COPY + IMAGE */}
        <div className="hidden w-1/2 flex-col justify-center md:flex pr-8">
          <h1 className="text-5xl font-bold text-[#E2E8F0] mb-6">
            Welcome to <span className="text-[#E2E8F0]">MyDuka</span>
          </h1>
          <p className="text-lg leading-8 text-[#E2E8F0]/70 max-w-2xl">
            A web-based inventory management system designed to help merchants
            and store admins efficiently track stock, manage procurement
            payments, and generate insightful reports.
          </p>

          {/* Floating notification cards */}
          <div className="mt-10 space-y-4">
            <div className="bg-[#1E293B] backdrop-blur-md border border-[#1E293B] rounded-2xl p-5 shadow-2xl animate-float">
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 bg-[#63C2B0] rounded-full animate-pulse"></div>
                <span className="text-[#E2E8F0] text-sm">Real-time inventory tracking</span>
              </div>
            </div>
            <div className="bg-[#1E293B] backdrop-blur-md border border-[#1E293B] rounded-2xl p-5 shadow-2xl animate-float delay-200 ml-8">
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 bg-[#63C2B0] rounded-full animate-pulse"></div>
                <span className="text-[#E2E8F0] text-sm">Automated payment processing</span>
              </div>
            </div>
            <div className="bg-[#1E293B] backdrop-blur-md border border-[#1E293B] rounded-2xl p-5 shadow-2xl animate-float delay-500">
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 bg-[#63C2B0] rounded-full animate-pulse"></div>
                <span className="text-[#E2E8F0] text-sm">Advanced analytics & reports</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: FORM */}
        <div className="w-full md:w-1/2 pl-6">
          <div className="mx-auto w-full max-w-md bg-[#1E293B] backdrop-blur-xl border border-[#1E293B] rounded-3xl p-9 shadow-2xl">
            <div className="flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0F172A] text-[#E2E8F0] font-bold text-xl shadow-lg shadow-black/30">
                M
              </div>
            </div>

            <h2 className="mt-6 text-center text-2xl font-bold text-[#E2E8F0]">{roleLabel}</h2>
            <p className="mt-2 text-center text-sm text-[#E2E8F0]/70">
              {isInviteFlow
                ? "Set your admin profile to activate the invite."
                : "Welcome back! Please enter your details"}
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              {isInviteFlow ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#E2E8F0]/70">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full rounded-xl border border-[#1E293B] bg-[#1E293B] px-4 py-2.5 text-sm text-[#E2E8F0] placeholder-[#E2E8F0]/50 focus:border-[#63C2B0] focus:outline-none focus:ring-2 focus:ring-[#63C2B0]/30"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#E2E8F0]/70">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full rounded-xl border border-[#1E293B] bg-[#1E293B] px-4 py-2.5 text-sm text-[#E2E8F0] placeholder-[#E2E8F0]/50 focus:border-[#63C2B0] focus:outline-none focus:ring-2 focus:ring-[#63C2B0]/30"
                    />
                  </div>
                </div>
              ) : null}
              {/* EMAIL */}
              {isInviteFlow ? (
                <div className="rounded-xl border border-[#1E293B] bg-[#0F172A] px-4 py-3 text-sm text-[#E2E8F0]/75">
                  Admin invite token detected. Your email will be taken from the invite link.
                </div>
              ) : (
                <div>
                  <label className="mb-3 flex items-center gap-2 text-sm font-medium text-[#E2E8F0]/70">
                    <Mail className="h-4 w-4 text-[#E2E8F0]/70" />
                    Email
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                      <Mail className="h-5 w-5 text-[#E2E8F0]/50" />
                    </div>
                    <input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-[#1E293B] bg-[#1E293B] py-2.5 pl-12 pr-4 text-sm text-[#E2E8F0] placeholder-[#E2E8F0]/50 transition-all focus:border-[#63C2B0] focus:outline-none focus:ring-2 focus:ring-[#63C2B0]/30"
                    />
                  </div>
                </div>
              )}

              {/* PASSWORD */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-[#E2E8F0]/70 mb-3">
                  <Lock className="h-4 w-4 text-[#E2E8F0]/70" />
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-[#E2E8F0]/50" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-2.5 bg-[#1E293B] backdrop-blur-md border border-[#1E293B] rounded-xl text-sm text-[#E2E8F0] placeholder-[#E2E8F0]/50 focus:outline-none focus:ring-2 focus:ring-[#63C2B0]/30 focus:border-[#63C2B0] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#E2E8F0]/60 hover:text-[#E2E8F0] transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* REMEMBER & FORGOT */}
              {!isInviteFlow ? (
                <div className="flex items-center justify-between text-xs">
                  <label className="flex items-center gap-2 text-[#E2E8F0]/70">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-[#1E293B] bg-[#1E293B] text-[#63C2B0] focus:ring-[#63C2B0]/30"
                    />
                    Remember me
                  </label>

                  <button
                    type="button"
                    className="text-[#63C2B0] hover:text-[#63C2B0] transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              ) : null}

              {error ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 backdrop-blur-md px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              ) : null}

              {/* BUTTON */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-[#63C2B0] py-2.5 text-sm font-semibold text-[#0F172A] shadow-lg shadow-[#63C2B0]/20 hover:shadow-[#63C2B0]/30 hover:scale-[1.02] transition-all duration-200"
              >
                {isSubmitting ? "Working..." : isInviteFlow ? "Create Admin Account" : "Log In"}
              </button>
            </form>

            {/* ROLES */}
            <p className="mt-5 text-center text-xs text-[#E2E8F0]/60">
              Don&apos;t have an account?{" "}
              <span className="text-[#63C2B0] hover:text-[#63C2B0] cursor-pointer transition-colors">Sign Up</span>
            </p>
            
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full bg-[#1E293B] backdrop-blur-md border border-[#1E293B] px-3 py-1.5 text-[11px] text-[#E2E8F0]/70">
                Merchant
              </span>
              <span className="rounded-full bg-[#1E293B] backdrop-blur-md border border-[#1E293B] px-3 py-1.5 text-[11px] text-[#E2E8F0]/70">
                Admin
              </span>
              <span className="rounded-full bg-[#1E293B] backdrop-blur-md border border-[#1E293B] px-3 py-1.5 text-[11px] text-[#E2E8F0]/70">
                Clerk
              </span>
            </div>
            
            {!isInviteFlow ? (
              <div className="mt-6 border-t border-[#1E293B] pt-5">
                <p className="mb-2 text-xs font-semibold text-[#E2E8F0]">Demo Credentials:</p>
                <div className="space-y-1 text-[11px] text-[#E2E8F0]/70">
                  <p><span className="font-medium text-[#E2E8F0]">Merchant:</span> merchant@myduka.com / merchant123</p>
                  <p><span className="font-medium text-[#E2E8F0]">Admin:</span> admin@myduka.com / admin123</p>
                  <p><span className="font-medium text-[#E2E8F0]">Clerk:</span> clerk@myduka.com / clerk123</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
