import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Crown, CheckCircle2, CreditCard, ShieldCheck } from "lucide-react";
import { useApi, errMsg, tl, fmtIso } from "@/lib/api";
import { useMe } from "@/lib/me";
import { PageTitle } from "@/components/common";
import { Spinner } from "@/pages/AppGate";
import { Progress } from "@/components/ui/progress";

export default function Billing() {
  const api = useApi();
  const me = useMe();
  const [b, setB] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get("/billing").then((r) => setB(r.data)); }, [api]);

  const upgrade = async () => {
    setBusy(true);
    try {
      const { data } = await api.post("/billing/checkout", { origin_url: window.location.origin });
      window.location.href = data.url;
    } catch (err) { toast.error(errMsg(err, "Ödeme başlatılamadı")); setBusy(false); }
  };

  if (!b) return <Spinner />;
  const pro = b.plan === "pro";
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageTitle title="Abonelik" />
      <div className={`rise relative overflow-hidden rounded-2xl p-6 ${pro ? "bg-slate-900 text-white grain" : "border border-slate-300 bg-white"}`} data-testid="billing-current-plan">
        <p className="relative text-xs font-bold uppercase tracking-wider opacity-70">Mevcut plan</p>
        <p className="relative mt-1 flex items-center gap-2 font-heading text-5xl font-extrabold uppercase">{pro && <Crown className="h-9 w-9 text-yellow-400" />}{pro ? "Pro" : "Ücretsiz"}</p>
        {pro ? (
          <p className="relative mt-2 text-slate-300" data-testid="billing-pro-until">Bitiş tarihi: {fmtIso(b.pro_until)} · {b.staff_count} / {b.staff_limit} personel</p>
        ) : (
          <div className="relative mt-4">
            <div className="flex justify-between text-sm font-bold"><span>Bu ayki iş hakkı</span><span data-testid="billing-usage">{b.jobs_this_month} / {b.free_job_limit}</span></div>
            <Progress value={Math.min(100, (b.jobs_this_month / b.free_job_limit) * 100)} className="mt-2 h-3" />
          </div>
        )}
      </div>

      {me.owner && (
        <div className="rise d1 rounded-2xl border-2 border-slate-900 bg-white p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-heading text-3xl font-extrabold uppercase">{pro ? "Pro süresini uzat" : "Pro'ya geç"}</p>
              <p className="font-heading text-5xl font-extrabold">{tl(b.price)}<span className="text-lg font-semibold text-slate-600"> / ay</span></p>
            </div>
            <Crown className="h-12 w-12 text-yellow-500" />
          </div>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            {["Sınırsız iş", "10 personele kadar", "Firma logolu servis formu", "Öncelikli destek"].map((i) => (
              <li key={i} className="flex items-center gap-2 font-semibold"><CheckCircle2 className="h-5 w-5 text-emerald-600" />{i}</li>
            ))}
          </ul>
          <button onClick={upgrade} disabled={busy} data-testid="billing-upgrade-button"
            className="tap mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 text-lg font-extrabold text-slate-900 shadow-md hover:bg-yellow-300 disabled:opacity-60">
            <CreditCard className="h-5 w-5" />{busy ? "Yönlendiriliyor..." : pro ? "30 gün uzat" : "Kartla öde ve Pro'ya geç"}
          </button>
          <p className="mt-3 flex items-start gap-2 text-sm text-slate-600" data-testid="billing-test-note">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />Her ödeme Pro'yu 30 gün uzatır. Şu an test modundadır; gerçek para çekilmez (test kartı: 4242 4242 4242 4242).
          </p>
        </div>
      )}
      {!me.owner && <p className="text-slate-600">Abonelik firma yöneticisi tarafından yönetilir.</p>}
    </div>
  );
}
