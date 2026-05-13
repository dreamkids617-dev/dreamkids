import { Toaster } from "@/components/ui/toaster";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { CompareProvider } from "./contexts/CompareContext";
import CompareBar from "./components/CompareBar";
import Index from "./pages/Index";
import Search from "./pages/Search";
import Detail from "./pages/Detail";
import Login from "./pages/Login";
import MyPage from "./pages/MyPage";
import Admin from "./pages/Admin";
import AdminLogin from "./pages/AdminLogin";
import AdminSignup from "./pages/AdminSignup";
import ResetPassword from "./pages/ResetPassword";
import Compare from "./pages/Compare";

function App() {
  return (
    <AuthProvider>
      <CompareProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/search" element={<Search />} />
            <Route path="/detail/:id" element={<Detail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/mypage" element={<MyPage />} />
            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/signup" element={<AdminSignup />} />
            <Route path="/admin/dashboard" element={<Admin />} />
            <Route path="/admin-login" element={<Navigate to="/admin/login" replace />} />
            <Route path="/admin-signup" element={<Navigate to="/admin/signup" replace />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/compare" element={<Compare />} />
          </Routes>
          <CompareBar />
          <Toaster />
        </BrowserRouter>
      </CompareProvider>
    </AuthProvider>
  );
}

export default App;