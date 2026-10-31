import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Phone, MapPin, Pencil, Plus, Trash2, MessageCircle } from "lucide-react";
import { useApi, errMsg, tl, waPhone } from "@/lib/api";
import { JobCard, Empty } from "@/components/common";
import { Spinner } from "@/pages/AppGate";
import { CustomerDialog } from "@/pages/Customers";

export default function CustomerDetail() {
  const { id } = useParams();
  const api = useApi();
  const navigate = useNavigate();
  const [c, setC] = useState(null);
  const load = () => api.get(`/customers/${id}`).then((r) => setC(r.data)).catch(() => navigate("/app/musteriler", { replace: true }));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const del = async () => {
    if (!window.confirm("Müşteri silinsin mi?")) return;
    try { await api.delete(`/customers/${id}`); toast.success("Müşteri silindi"); navigate("/app/musteriler", { replace: true }); }
    catch (err) { toast.error(errMsg(err)); }
  };

  if (!c) return <Spinner />;
  const done = c.jobs.filter((j) => j.status === "tamamlandi");
  const total = done.reduce((s, j) => s + (j.price || 0), 0);
  const debt = done.filter((j) => !j.paid).reduce((s, j) => s + (j.price || 0), 0);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="rise rounded-2xl bg-slate-900 p-6 text-white grain relative overflow-hidden">
        <h1 className="relative font-heading text-4xl font-extrabold uppercase sm:text-5xl" data-testid="customer-detail-name">{c.name}</h1>
        <div className="relative mt-3 space-y-1 text-slate-200">
          {c.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4" />{c.phone}</p>}
          {c.address && <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{c.address}</p>}
          {c.notes && <p className="pt-2 text-sm text-slate-300">{c.notes}</p>}
        </div>
        <div className="relative mt-5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/10 p-3"><p className="text-xs font-bold uppercase text-slate-300">İş</p><p className="font-heading text-2xl font-bold" data-testid="customer-job-count">{c.jobs.length}</p></div>
          <div className="rounded-xl bg-white/10 p-3"><p className="text-xs font-bold uppercase text-slate-300">Toplam</p><p className="font-heading text-2xl font-bold">{tl(total)}</p></div>
          <div className="rounded-xl bg-yellow-400 p-3 text-slate-900"><p className="text-xs font-bold uppercase">Borç</p><p className="font-heading text-2xl font-bold" data-testid="customer-debt">{tl(debt)}</p></div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {c.phone && <a href={`tel:${c.phone}`} className="tap flex h-12 items-center gap-2 rounded-xl border-2 border-slate-900 bg-white px-4 font-bold" data-testid="customer-call-button"><Phone className="h-4 w-4" />Ara</a>}
        {c.phone && <a href={`https://wa.me/${waPhone(c.phone)}`} target="_blank" rel="noreferrer" className="tap flex h-12 items-center gap-2 rounded-xl border-2 border-emerald-600 bg-white px-4 font-bold text-emerald-800" data-testid="customer-whatsapp-button"><MessageCircle className="h-4 w-4" />WhatsApp</a>}
        <CustomerDialog initial={c} onSaved={() => load()} trigger={<button className="tap flex h-12 items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-4 font-bold" data-testid="customer-edit-button"><Pencil className="h-4 w-4" />Düzenle</button>} />
        <button onClick={del} className="tap flex h-12 items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-4 font-bold text-rose-700" data-testid="customer-delete-button"><Trash2 className="h-4 w-4" />Sil</button>
      </div>
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold uppercase">Geçmiş işler</h2>
        <Link to="/app/isler/yeni" className="text-sm font-bold text-blue-700" data-testid="customer-new-job-link"><Plus className="mr-1 inline h-4 w-4" />İş ekle</Link>
      </div>
      {c.jobs.length === 0 ? <Empty text="Bu müşteri için henüz iş yok." /> : (
        <div className="grid gap-3 md:grid-cols-2">{c.jobs.map((j) => <JobCard key={j.id} job={j} />)}</div>
      )}
    </div>
  );
}
