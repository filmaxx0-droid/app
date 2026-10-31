import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useApi } from "@/lib/api";
import { useMe } from "@/lib/me";

export default function PaymentSuccess() {
  const api = useApi();
  const me = useMe();
  const [params] = useSearchParams();
  const [state, setState] = useState("checking");

  useEffect(() => {
    const sid = params.get("session_id");
    if (!sid) return setState("failed");
    let tries = 0;
    let timer;
    const poll = async () => {
      try {
        const { data } = await api.get(`/payments/status/${sid}`);
        if (data.payment_status === "paid") { setState("paid"); me.refresh(); return; }
        if (data.status === "expired") return setState("failed");
      } catch { /* retry */ }
      if (++tries >= 10) return setState("timeout");
      timer = setTimeout(poll, 2000);
    };
    poll();
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-slate-300 bg-white p-8 text-center" data-testid={`payment-${state}`}>
      {state === "checking" && <><Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" /><p className="mt-4 text-lg font-bold">Ödeme kontrol ediliyor...</p></>}
      {state === "paid" && <><CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" /><p className="mt-4 font-heading text-4xl font-extrabold uppercase">Pro aktif!</p><p className="mt-2 text-slate-700">Artık sınırsız iş açabilir ve ustalarınızı ekleyebilirsiniz.</p></>}
      {state === "failed" && <><XCircle className="mx-auto h-14 w-14 text-rose-600" /><p className="mt-4 text-lg font-bold">Ödeme tamamlanmadı.</p></>}
      {state === "timeout" && <p className="text-lg font-bold">Ödeme onayı gecikti. Birkaç dakika sonra abonelik sayfasını kontrol edin.</p>}
      {state !== "checking" && <Link to="/app/abonelik" className="tap mt-6 inline-flex h-12 items-center rounded-xl bg-slate-900 px-6 font-bold text-white" data-testid="payment-back-button">Aboneliğe dön</Link>}
    </div>
  );
}
