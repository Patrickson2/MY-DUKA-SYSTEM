import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/admin" element={<AdminPanel />} />
    </Routes>
  );
}
