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
    <div className="min-h-screen bg-white">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center gap-12 px-8 py-12">
        {/* LEFT: COPY + IMAGE */}
        <div className="hidden w-1/2 flex-col justify-center md:flex">
          <h1 className="text-4xl font-semibold text-slate-900">
            Welcome to MyDuka
          </h1>
          <p className="mt-4 max-w-lg text-base leading-7 text-slate-600">
            A web-based inventory management system designed to help merchants
            and store admins efficiently track stock, manage procurement
            payments, and generate insightful reports.
          </p>

          <div className="mt-10 w-full max-w-lg">
            <img
              src="/images/login-illustration.png"
              alt="Login illustration"
              className="w-full object-contain"
            />
          </div>
        </div>

        {/* RIGHT: FORM */}
        <div className="w-full md:w-1/2">
          <div className="mx-auto w-full max-w-md rounded-3xl bg-blue-50 p-8 shadow-sm">
            <div className="flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white font-bold">
                M
              </div>
            </div>

            <h2 className="mt-6 text-center text-2xl font-semibold text-slate-900">
              Sign In
            </h2>
            <p className="mt-2 text-center text-sm text-slate-500">
              Welcome back! Please enter your details
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {/* EMAIL */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <Mail className="h-4 w-4 text-slate-500" />
                  Email
                </label>
                <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent text-sm text-slate-700 focus:outline-none"
                  />
                </div>
              </div>

              {/* PASSWORD */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <Lock className="h-4 w-4 text-slate-500" />
                  Password
                </label>
                <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-500">
                  <Lock className="h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-transparent text-sm text-slate-700 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* REMEMBER & FORGOT */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Remember me for 30 days
                </label>

                <button
                  type="button"
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  Forgot password?
                </button>
              </div>

              {error ? (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
                  {error}
                </div>
              ) : null}

              {/* BUTTON */}
              <button
                type="submit"
                className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow hover:bg-indigo-700 transition"
              >
                Log In
              </button>
            </form>

            {/* ROLES */}
            <p className="mt-5 text-center text-xs text-slate-500">
              Don&apos;t you have an account?{" "}
              <span className="text-indigo-600">Sign Up</span>
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-600">
              <span className="rounded-full bg-slate-200 px-3 py-1">
                Merchant
              </span>
              <span className="rounded-full bg-slate-200 px-3 py-1">Admin</span>
              <span className="rounded-full bg-slate-200 px-3 py-1">Clerk</span>
            </div>
            <div className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500">
              <p className="font-semibold text-slate-600">Demo Credentials:</p>
              <p className="mt-2">
                <span className="font-semibold">Merchant:</span>{" "}
                merchant@myduka.com / merchant123
              </p>
              <p className="mt-1">
                <span className="font-semibold">Admin:</span> admin@myduka.com /
                admin123
              </p>
              <p className="mt-1">
                <span className="font-semibold">Clerk:</span> clerk@myduka.com /
                clerk123
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
