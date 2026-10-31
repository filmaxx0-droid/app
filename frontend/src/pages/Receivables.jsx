import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Wallet, MessageCircle } from "lucide-react";
import { useApi, tl, fmtDateTime, waPhone, PAY_METHODS } from "@/lib/api";
import { useMe } from "@/lib/me";
import { PageTitle, Empty } from "@/components/common";
import { Spinner } from "@/pages/AppGate";

export default function Receivables() {
  const api = useApi();
  const me = useMe();
  const [list, setList] = useState(null);
  useEffect(() => { api.get("/receivables").then((r) => setList(r.data)); }, [api]);

  const markPaid = async (j, method) => {
    await api.patch(`/jobs/${j.id}/payment`, { paid: true, payment_method: method });
    toast.success(`${j.customer_name}: ${PAY_METHODS[method]} ile ödendi`);
    setList((l) => l.filter((x) => x.id !== j.id));
  };

  if (!list) return <Spinner />;
  const total = list.reduce((s, j) => s + (j.price || 0), 0);
  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title="Tahsilat" sub="Tamamlanmış ama ödenmemiş işler" />
      <div className="rise mb-5 flex items-center justify-between rounded-2xl bg-rose-600 p-5 text-white">
        <div><p className="text-xs font-bold uppercase tracking-wider text-rose-100">Bekleyen alacak</p><p className="font-heading text-4xl font-extrabold" data-testid="receivables-total">{tl(total)}</p></div>
        <p className="font-heading text-2xl font-bold">{list.length} iş</p>
      </div>
      {list.length === 0 ? <Empty icon={Wallet} text="Bekleyen tahsilat yok. Tebrikler!" /> : (
        <div className="space-y-3">
          {list.map((j) => (
            <div key={j.id} className="rounded-2xl border border-slate-300 bg-white p-4" data-testid={`receivable-${j.id}`}>
              <div className="flex items-start justify-between gap-3">
                <Link to={`/app/isler/${j.id}`} className="min-w-0">
                  <p className="truncate text-lg font-bold">{j.customer_name}</p>
                  <p className="truncate text-sm font-medium text-slate-600">{j.job_type} · {fmtDateTime(j.scheduled_at)}</p>
                </Link>
                <p className="font-mono text-xl font-bold text-rose-700">{tl(j.price)}</p>
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {Object.entries(PAY_METHODS).map(([k, l]) => (
                  <button key={k} onClick={() => markPaid(j, k)} data-testid={`receivable-pay-${k}-${j.id}`} className="tap h-11 rounded-xl border-2 border-emerald-600 text-sm font-bold text-emerald-800 hover:bg-emerald-50">{l}</button>
                ))}
                <a href={`https://wa.me/${waPhone(j.customer_phone)}?text=${encodeURIComponent(`Merhaba ${j.customer_name}, ${me.company.name} olarak "${j.job_type}" servisinize ait ${tl(j.price)} tutarındaki ödemeyi hatırlatmak isteriz. Teşekkürler.`)}`}
                  target="_blank" rel="noreferrer" data-testid={`receivable-remind-${j.id}`} className="tap flex h-11 items-center justify-center gap-1 rounded-xl bg-emerald-600 text-sm font-bold text-white"><MessageCircle className="h-4 w-4" />Hatırlat</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
