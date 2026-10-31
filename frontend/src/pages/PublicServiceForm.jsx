import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { CheckCircle2, Phone, MapPin, Printer, Wrench, Loader2 } from "lucide-react";
import { API, tl, fmtDateTime, fmtIso, PAY_METHODS } from "@/lib/api";

const Row = ({ label, children }) => (
  <div className="flex justify-between gap-4 border-b border-slate-200 py-2.5 text-sm">
    <span className="font-semibold uppercase tracking-wide text-slate-500">{label}</span>
    <span className="text-right font-semibold text-slate-900">{children}</span>
  </div>
);

export default function PublicServiceForm() {
  const { token } = useParams();
  const [d, setD] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => { axios.get(`${API}/public/form/${token}`).then((r) => setD(r.data)).catch(() => setErr(true)); }, [token]);

  if (err) return <div className="grid min-h-screen place-items-center p-6 text-center font-bold" data-testid="service-form-not-found">Servis formu bulunamadı.</div>;
  if (!d) return <div className="grid min-h-screen place-items-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  const { job, company } = d;
  const photos = (k) => job.photos.filter((p) => p.kind === k);

  return (
    <div className="min-h-screen bg-slate-100 px-3 py-6">
      <article className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-xl" data-testid="service-form">
        <header className="flex items-center gap-4 bg-slate-900 p-5 text-white">
          {company.has_logo ? (
            <img src={`${API}/public/form/${token}/logo`} alt={company.name} className="h-14 w-14 rounded-lg bg-white object-contain p-1" data-testid="service-form-logo" />
          ) : <span className="grid h-14 w-14 place-items-center rounded-lg bg-yellow-400 text-slate-900"><Wrench className="h-7 w-7" /></span>}
          <div className="min-w-0">
            <p className="truncate font-heading text-2xl font-extrabold uppercase" data-testid="service-form-company">{company.name}</p>
            {company.phone && <p className="flex items-center gap-1 text-sm text-slate-300"><Phone className="h-3.5 w-3.5" />{company.phone}</p>}
            {company.address && <p className="flex items-center gap-1 text-sm text-slate-300"><MapPin className="h-3.5 w-3.5" />{company.address}</p>}
          </div>
        </header>
        <div className="hazard h-1.5" />
        <div className="p-5">
          <div className="flex items-center justify-between">
            <h1 className="font-heading text-3xl font-extrabold uppercase">Servis formu</h1>
            <span className="font-mono text-sm font-bold text-slate-500">#{job.number}</span>
          </div>
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-900"><CheckCircle2 className="h-4 w-4" />Tamamlandı</p>
          <div className="mt-4">
            <Row label="Müşteri"><span data-testid="service-form-customer">{job.customer_name}</span></Row>
            {job.address && <Row label="Adres">{job.address}</Row>}
            <Row label="Hizmet">{job.job_type}</Row>
            <Row label="Randevu">{fmtDateTime(job.scheduled_at)}</Row>
            <Row label="Tamamlanma">{fmtIso(job.completed_at)}</Row>
            {job.assigned_name && <Row label="Teknisyen">{job.assigned_name}</Row>}
          </div>
          {job.work_notes && <section className="mt-5"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Yapılan işlem</p><p className="mt-1 whitespace-pre-line text-slate-900" data-testid="service-form-work-notes">{job.work_notes}</p></section>}
          {job.materials && <section className="mt-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Kullanılan malzeme</p><p className="mt-1 whitespace-pre-line text-slate-900">{job.materials}</p></section>}
          {["once", "sonra"].map((k) => photos(k).length > 0 && (
            <section key={k} className="mt-5">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{k === "once" ? "Önce" : "Sonra"}</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {photos(k).map((p) => <img key={p.id} src={`${API}/public/form/${token}/photo/${p.id}`} alt={k} className="aspect-square w-full rounded-xl border border-slate-200 object-cover" data-testid={`service-form-photo-${p.id}`} />)}
              </div>
            </section>
          ))}
          <div className="mt-6 flex items-center justify-between rounded-xl bg-slate-900 p-4 text-white">
            <div>
              <p className="text-xs font-bold uppercase text-slate-300">Toplam tutar</p>
              <p className="font-heading text-3xl font-extrabold" data-testid="service-form-total">{tl(job.price)}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-bold ${job.paid ? "bg-emerald-500 text-white" : "bg-yellow-400 text-slate-900"}`} data-testid="service-form-paid">
              {job.paid ? `Ödendi${job.payment_method ? " · " + PAY_METHODS[job.payment_method] : ""}` : "Ödeme bekleniyor"}
            </span>
          </div>
          <button onClick={() => window.print()} className="no-print tap mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-slate-900 font-bold" data-testid="service-form-print-button"><Printer className="h-5 w-5" />Yazdır / PDF kaydet</button>
        </div>
      </article>
      <p className="no-print mt-4 text-center text-xs text-slate-500">SahaCep ile oluşturuldu</p>
    </div>
  );
}
