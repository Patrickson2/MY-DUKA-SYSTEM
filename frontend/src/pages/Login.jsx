import { useState } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const credentials = {
    merchant: {
      email: "merchant@myduka.com",
      password: "merchant123",
      route: "/merchant",
    },
    admin: {
      email: "admin@myduka.com",
      password: "admin123",
      route: "/admin",
    },
    clerk: {
      email: "clerk@myduka.com",
      password: "clerk123",
      route: "/clerk",
    },
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    const match = Object.values(credentials).find(
      (user) => user.email === email && user.password === password
    );

    if (!match) {
      setError("Invalid email or password. Try the demo credentials.");
      return;
    }

    navigate(match.route);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Glowing orbs */}
      <div className="absolute top-20 left-20 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      
      <div className="mx-auto flex min-h-screen max-w-7xl items-center gap-20 px-12 py-12 relative z-10">
        {/* LEFT: COPY + IMAGE */}
        <div className="hidden w-1/2 flex-col justify-center md:flex pr-8">
          <h1 className="text-6xl font-bold text-white mb-8">
            Welcome to <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">MyDuka</span>
          </h1>
          <p className="text-xl leading-9 text-slate-300 max-w-2xl">
            A web-based inventory management system designed to help merchants
            and store admins efficiently track stock, manage procurement
            payments, and generate insightful reports.
          </p>

          {/* Floating notification cards */}
          <div className="mt-16 space-y-6">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-2xl animate-float">
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-white text-base">Real-time inventory tracking</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-2xl animate-float delay-200 ml-12">
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-white text-base">Automated payment processing</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-2xl animate-float delay-500">
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 bg-purple-400 rounded-full animate-pulse"></div>
                <span className="text-white text-base">Advanced analytics & reports</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: FORM */}
        <div className="w-full md:w-1/2 pl-8">
          <div className="mx-auto w-full max-w-lg bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-10 shadow-2xl">
            <div className="flex items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xl shadow-lg shadow-indigo-500/25">
                M
              </div>
            </div>

            <h2 className="mt-8 text-center text-3xl font-bold text-white">
              Sign In
            </h2>
            <p className="mt-3 text-center text-slate-300">
              Welcome back! Please enter your details
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              {/* EMAIL */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-200 mb-3">
                  <Mail className="h-4 w-4 text-indigo-400" />
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-200 mb-3">
                  <Lock className="h-4 w-4 text-indigo-400" />
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-white transition-colors"
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
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-slate-300">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/20 bg-white/10 text-indigo-500 focus:ring-indigo-500/50"
                  />
                  Remember me
                </label>

                <button
                  type="button"
                  className="text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              {error ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 backdrop-blur-md px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              ) : null}

              {/* BUTTON */}
              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] transition-all duration-200"
              >
                Log In
              </button>
            </form>

            {/* ROLES */}
            <p className="mt-6 text-center text-sm text-slate-300">
              Don&apos;t have an account?{" "}
              <span className="text-indigo-400 hover:text-indigo-300 cursor-pointer transition-colors">Sign Up</span>
            </p>
            
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 text-xs text-slate-300">
                Merchant
              </span>
              <span className="rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 text-xs text-slate-300">
                Admin
              </span>
              <span className="rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 text-xs text-slate-300">
                Clerk
              </span>
            </div>
            
            <div className="mt-8 border-t border-white/20 pt-6">
              <p className="font-semibold text-slate-200 text-sm mb-3">Demo Credentials:</p>
              <div className="space-y-2 text-xs text-slate-300">
                <p><span className="text-indigo-400 font-medium">Merchant:</span> merchant@myduka.com / merchant123</p>
                <p><span className="text-blue-400 font-medium">Admin:</span> admin@myduka.com / admin123</p>
                <p><span className="text-purple-400 font-medium">Clerk:</span> clerk@myduka.com / clerk123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
