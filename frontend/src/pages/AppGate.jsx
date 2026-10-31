import { useEffect, useState, useCallback } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useApi } from "@/lib/api";
import { MeContext } from "@/lib/me";
import AppShell from "@/components/AppShell";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import Jobs from "@/pages/Jobs";
import JobForm from "@/pages/JobForm";
import JobDetail from "@/pages/JobDetail";
import Customers from "@/pages/Customers";
import CustomerDetail from "@/pages/CustomerDetail";
import Team from "@/pages/Team";
import Billing from "@/pages/Billing";
import PaymentSuccess from "@/pages/PaymentSuccess";
import Receivables from "@/pages/Receivables";
import Settings from "@/pages/Settings";

export const Spinner = () => (
  <div className="grid min-h-[50vh] place-items-center" data-testid="loading-spinner"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
);

export default function AppGate() {
  const api = useApi();
  const [me, setMe] = useState(null);
  const [error, setError] = useState(false);
  const refresh = useCallback(() => api.get("/me").then((r) => setMe(r.data)).catch(() => setError(true)), [api]);
  useEffect(() => { refresh(); }, [refresh]);

  if (error) return <p className="p-6" data-testid="me-error">Bağlantı hatası. Sayfayı yenileyin.</p>;
  if (!me) return <Spinner />;
  if (!me.company) return <Onboarding me={me} onDone={refresh} />;
  const owner = me.role === "owner";
  return (
    <MeContext.Provider value={{ ...me, owner, refresh }}>
      <AppShell>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="isler" element={<Jobs />} />
          <Route path="isler/:id" element={<JobDetail />} />
          {owner && <Route path="isler/yeni" element={<JobForm />} />}
          {owner && <Route path="isler/:id/duzenle" element={<JobForm />} />}
          {owner && <Route path="musteriler" element={<Customers />} />}
          {owner && <Route path="musteriler/:id" element={<CustomerDetail />} />}
          {owner && <Route path="tahsilat" element={<Receivables />} />}
          {owner && <Route path="ekip" element={<Team />} />}
          {owner && <Route path="firma" element={<Settings />} />}
          <Route path="abonelik" element={<Billing />} />
          <Route path="odeme/basarili" element={<PaymentSuccess />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </AppShell>
    </MeContext.Provider>
  );
}
