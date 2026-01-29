import { useState } from "react";
import {
  AlertTriangle,
  Box,
  LogOut,
  PackagePlus,
  Send,
  TrendingUp,
} from "lucide-react";

export default function Dashboard() {
  const [activeForm, setActiveForm] = useState("record");
  const stats = [
    {
      label: "Total Products",
      value: "3",
      icon: <Box className="h-5 w-5" />,
      color: "bg-blue-50 text-blue-600",
    },
    {
      label: "Total Stock",
      value: "405",
      icon: <TrendingUp className="h-5 w-5" />,
      color: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Spoilt Items",
      value: "5",
      icon: <AlertTriangle className="h-5 w-5" />,
      color: "bg-rose-50 text-rose-600",
    },
  ];

  const products = [
    {
      product: "Rice - 5kg",
      category: "Grains",
      stock: 120,
      spoil: 3,
      buyPrice: "KES 450",
      sellPrice: "KES 600",
      payment: "Paid",
    },
    {
      product: "Cooking Oil - 2L",
      category: "Oils",
      stock: 85,
      spoil: 2,
      buyPrice: "KES 280",
      sellPrice: "KES 350",
      payment: "Unpaid",
    },
    {
      product: "Sugar - 2kg",
      category: "Sweeteners",
      stock: 200,
      spoil: 0,
      buyPrice: "KES 180",
      sellPrice: "KES 240",
      payment: "Paid",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
              M
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900">MyDuka</h1>
              <p className="text-xs text-slate-500">
                Data Entry Clerk · Downtown Store
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-600">
            <div className="text-right">
              Mike Clerk <span className="block text-xs">Clerk</span>
            </div>
            <button className="rounded-full border border-slate-200 p-2 text-slate-500 hover:text-slate-700">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">{stat.label}</p>
                <span className={`rounded-lg p-2 ${stat.color}`}>
                  {stat.icon}
                </span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <button
            onClick={() => setActiveForm("record")}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700"
          >
            <PackagePlus className="h-4 w-4" />
            Record New Product
          </button>
          <button
            onClick={() => setActiveForm("request")}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-700"
          >
            <Send className="h-4 w-4" />
            Request Supply
          </button>
        </div>

        {activeForm === "record" ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">
              Record New Product
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Product Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Rice - 5kg"
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Category
                </label>
                <input
                  type="text"
                  placeholder="e.g., Grains"
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Buying Price (KES)
                </label>
                <input
                  type="number"
                  placeholder="450"
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Selling Price (KES)
                </label>
                <input
                  type="number"
                  placeholder="600"
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Current Stock
                </label>
                <input
                  type="number"
                  placeholder="120"
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Spoilt Items
                </label>
                <input
                  type="number"
                  placeholder="0"
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Supplier
                </label>
                <input
                  type="text"
                  placeholder="Kenya Grains Ltd"
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Payment Status
                </label>
                <select className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <option>Paid</option>
                  <option>Unpaid</option>
                </select>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <button className="rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white">
                Record Product
              </button>
              <button
                onClick={() => setActiveForm("request")}
                className="rounded-lg bg-slate-200 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">
              Request Supply
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Product Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Rice - 5kg"
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Quantity Needed
                </label>
                <input
                  type="number"
                  placeholder="50"
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Notes
                </label>
                <textarea
                  rows={4}
                  placeholder="Reason for request..."
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <button className="rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white">
                Send Request
              </button>
              <button
                onClick={() => setActiveForm("record")}
                className="rounded-lg bg-slate-200 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="mt-8 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              My Recorded Products
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-400">
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Stock</th>
                  <th className="px-6 py-3">Spoilt</th>
                  <th className="px-6 py-3">Buy Price</th>
                  <th className="px-6 py-3">Sell Price</th>
                  <th className="px-6 py-3">Payment</th>
                </tr>
              </thead>
              <tbody>
                {products.map((item) => (
                  <tr key={item.product} className="border-t">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {item.product}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {item.category}
                    </td>
                    <td className="px-6 py-4">{item.stock}</td>
                    <td className="px-6 py-4">{item.spoil}</td>
                    <td className="px-6 py-4">{item.buyPrice}</td>
                    <td className="px-6 py-4">{item.sellPrice}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          item.payment === "Paid"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {item.payment}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
