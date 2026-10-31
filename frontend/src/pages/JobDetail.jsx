import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { Phone, MapPin, Clock, User, Camera, X, CheckCircle2, MessageCircle, Pencil, Trash2, ExternalLink, Navigation, Loader2, Copy } from "lucide-react";
import { useApi, errMsg, tl, fmtDateTime, fmtIso, STATUS, PAY_METHODS, waPhone, shrinkImage } from "@/lib/api";
import { useMe } from "@/lib/me";
import { StatusChip, AuthImage } from "@/components/common";
import { Spinner } from "@/pages/AppGate";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const FLOW = ["bekliyor", "yolda", "yapiliyor"];

function PhotoZone({ job, kind, label, onChange }) {
  const api = useApi();
  const ref = useRef();
  const [busy, setBusy] = useState(false);
  const [zoom, setZoom] = useState(null);
  const photos = job.photos.filter((p) => p.kind === kind);

  const upload = async (e) => {
    const files = [...e.target.files];
    e.target.value = "";
    if (!files.length) return;
    setBusy(true);
    for (const f of files) {
      try {
        const fd = new FormData();
        fd.append("kind", kind);
        fd.append("file", await shrinkImage(f));
        await api.post(`/jobs/${job.id}/photos`, fd);
      } catch (err) { toast.error(errMsg(err, "Fotoğraf yüklenemedi")); }
    }
    setBusy(false);
    onChange();
  };
  const remove = async (pid) => { await api.delete(`/jobs/${job.id}/photos/${pid}`); onChange(); };

  return (
    <div data-testid={`photo-zone-${kind}`}>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">{label}</p>
      <div className="grid grid-cols-3 gap-2">
        {photos.map((p) => (
          <div key={p.id} className="relative aspect-square overflow-hidden rounded-xl border border-slate-300">
            <AuthImage path={p.path} alt={label} className="h-full w-full cursor-zoom-in object-cover" onClick={setZoom} testid={`photo-${p.id}`} />
            <button onClick={() => remove(p.id)} data-testid={`photo-remove-${p.id}`} aria-label="Sil" className="tap absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-slate-900/80 text-white"><X className="h-4 w-4" /></button>
          </div>
        ))}
        <button onClick={() => ref.current.click()} disabled={busy} data-testid={`photo-add-${kind}`}
          className="tap flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-400 bg-slate-50 text-sm font-bold text-slate-700 hover:border-blue-600 hover:text-blue-700">
          {busy ? <Loader2 className="h-7 w-7 animate-spin" /> : <Camera className="h-7 w-7" />}{busy ? "Yükleniyor" : "Fotoğraf"}
        </button>
      </div>
      <input ref={ref} type="file" accept="image/*" capture="environment" multiple hidden onChange={upload} data-testid={`photo-input-${kind}`} />
      <Dialog open={!!zoom} onOpenChange={() => setZoom(null)}>
        <DialogContent className="max-w-3xl p-2"><img src={zoom} alt="" className="max-h-[80vh] w-full rounded-lg object-contain" /></DialogContent>
      </Dialog>
    </div>
  );
}

function PayPicker({ paid, method, onChange, prefix }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        {[[false, "Ödenmedi"], [true, "Ödendi"]].map(([v, l]) => (
          <button type="button" key={l} onClick={() => onChange(v, v ? method || "nakit" : null)} data-testid={`${prefix}-paid-${v}`}
            className={`tap h-12 rounded-xl border-2 font-bold ${paid === v ? (v ? "border-emerald-600 bg-emerald-600 text-white" : "border-rose-600 bg-rose-600 text-white") : "border-slate-300 bg-white"}`}>{l}</button>
        ))}
      </div>
      {paid && (
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(PAY_METHODS).map(([k, l]) => (
            <button type="button" key={k} onClick={() => onChange(true, k)} data-testid={`${prefix}-method-${k}`}
              className={`tap h-11 rounded-xl border-2 text-sm font-bold ${method === k ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white"}`}>{l}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function CompletePanel({ job, onDone }) {
  const api = useApi();
  const [f, setF] = useState({ work_notes: job.work_notes || "", materials: job.materials || "", paid: job.paid, payment_method: job.payment_method });
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/jobs/${job.id}/complete`, f);
      toast.success("İş tamamlandı");
      onDone();
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  };
  return (
    <section className="space-y-4 rounded-2xl border-2 border-slate-900 bg-white p-5" data-testid="complete-panel">
      <h2 className="font-heading text-2xl font-bold uppercase">İşi kapat</h2>
      <PhotoZone job={job} kind="once" label="Önce fotoğrafları" onChange={onDone} />
      <PhotoZone job={job} kind="sonra" label="Sonra fotoğrafları" onChange={onDone} />
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">Yapılan işlem</p>
        <Textarea value={f.work_notes} onChange={(e) => setF({ ...f, work_notes: e.target.value })} className="min-h-24 rounded-xl border-slate-300 text-base" placeholder="Örn. Kombi bakımı yapıldı, filtre temizlendi" data-testid="complete-work-notes" />
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">Kullanılan malzeme</p>
        <Textarea value={f.materials} onChange={(e) => setF({ ...f, materials: e.target.value })} className="min-h-20 rounded-xl border-slate-300 text-base" placeholder="Örn. 1 adet conta, 2 m bakır boru" data-testid="complete-materials" />
      </div>
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-600">Ödeme · {tl(job.price)}</p>
        <PayPicker paid={f.paid} method={f.payment_method} prefix="complete" onChange={(paid, payment_method) => setF({ ...f, paid, payment_method })} />
      </div>
      <button onClick={submit} disabled={busy} data-testid="complete-job-button"
        className="tap flex h-16 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-xl font-extrabold text-white shadow-lg hover:bg-emerald-700 disabled:opacity-60">
        <CheckCircle2 className="h-6 w-6" />{busy ? "Kaydediliyor..." : job.status === "tamamlandi" ? "Değişiklikleri kaydet" : "İşi tamamla"}
      </button>
    </section>
  );
}

function SharePanel({ job, companyName }) {
  const link = `${window.location.origin}/servis-formu/${job.public_token}`;
  const msg = `Merhaba ${job.customer_name}, ${companyName} olarak ${fmtDateTime(job.scheduled_at).slice(0, 10)} tarihli "${job.job_type}" servisiniz tamamlandı. Tutar: ${tl(job.price)}. Servis formunuz: ${link}`;
  const phone = waPhone(job.customer_phone);
  const wa = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  return (
    <section className="space-y-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-5" data-testid="share-panel">
      <h2 className="font-heading text-2xl font-bold uppercase text-emerald-950">Servis formu hazır</h2>
      <a href={wa} target="_blank" rel="noreferrer" data-testid="whatsapp-share-button"
        className="tap flex h-14 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-lg font-bold text-white shadow-md hover:bg-emerald-700">
        <MessageCircle className="h-6 w-6" /> WhatsApp ile gönder
      </a>
      {!phone && <p className="text-sm font-medium text-emerald-900">Müşterinin telefonu kayıtlı değil; WhatsApp'ta kişiyi kendiniz seçin.</p>}
      <div className="grid grid-cols-2 gap-2">
        <a href={link} target="_blank" rel="noreferrer" data-testid="open-service-form-link" className="tap flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-emerald-700 font-bold text-emerald-900"><ExternalLink className="h-4 w-4" />Formu aç</a>
        <button onClick={() => navigator.clipboard.writeText(link).then(() => toast.success("Link kopyalandı"))} data-testid="copy-service-form-link" className="tap flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-emerald-700 font-bold text-emerald-900"><Copy className="h-4 w-4" />Linki kopyala</button>
      </div>
    </section>
  );
}

export default function JobDetail() {
  const { id } = useParams();
  const api = useApi();
  const me = useMe();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const load = () => api.get(`/jobs/${id}`).then((r) => setJob(r.data)).catch(() => navigate("/app/isler", { replace: true }));
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const setStatus = async (status) => {
    try { setJob((await api.patch(`/jobs/${id}/status`, { status })).data); toast.success(`Durum: ${STATUS[status].label}`); }
    catch (err) { toast.error(errMsg(err)); }
  };
  const setPay = async (paid, payment_method) => setJob((await api.patch(`/jobs/${id}/payment`, { paid, payment_method })).data);
  const del = async () => { await api.delete(`/jobs/${id}`); toast.success("İş silindi"); navigate("/app/isler", { replace: true }); };

  if (!job) return <Spinner />;
  const done = job.status === "tamamlandi";
  const cancelled = job.status === "iptal";
  const nextStep = { bekliyor: ["yolda", "Yola çıktım"], yolda: ["yapiliyor", "İşe başladım"] }[job.status];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="rise rounded-2xl border border-slate-300 bg-white p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs font-bold text-slate-500">#{job.id.slice(0, 8).toUpperCase()}</p>
            <h1 className="font-heading text-4xl font-extrabold uppercase leading-none" data-testid="job-detail-title">{job.job_type}</h1>
          </div>
          <StatusChip status={job.status} testid="job-detail-status" />
        </div>
        <div className="mt-4 space-y-2 font-medium text-slate-800">
          <p className="flex items-center gap-2" data-testid="job-detail-customer"><User className="h-5 w-5 text-slate-500" />{job.customer_name}</p>
          <p className="flex items-center gap-2"><Clock className="h-5 w-5 text-slate-500" />{fmtDateTime(job.scheduled_at)}</p>
          {job.address && <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />{job.address}</p>}
          <p className="flex items-center gap-2 text-sm text-slate-600">Usta: <b>{job.assigned_name || "Atanmadı"}</b></p>
        </div>
        {job.description && <p className="mt-4 rounded-xl bg-slate-100 p-3 text-slate-800" data-testid="job-detail-description">{job.description}</p>}
        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
          <span className="text-sm font-bold uppercase text-slate-600">Ücret</span>
          <span className="font-mono text-2xl font-bold" data-testid="job-detail-price">{tl(job.price)}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {job.customer_phone ? (
            <a href={`tel:${job.customer_phone}`} data-testid="job-call-button" className="tap flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-slate-900 font-bold"><Phone className="h-5 w-5" />Ara</a>
          ) : <span className="flex h-12 items-center justify-center rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-400">Telefon yok</span>}
          <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address || "")}`} target="_blank" rel="noreferrer" data-testid="job-map-button"
            className="tap flex h-12 items-center justify-center gap-2 rounded-xl border-2 border-slate-900 font-bold"><Navigation className="h-5 w-5" />Yol tarifi</a>
        </div>
      </div>

      {!done && !cancelled && (
        <div className="space-y-3 rise d1" data-testid="status-actions">
          <div className="grid grid-cols-3 gap-2">
            {FLOW.map((s) => (
              <button key={s} onClick={() => setStatus(s)} data-testid={`status-set-${s}`}
                className={`tap h-12 rounded-xl border-2 text-sm font-bold ${job.status === s ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white"}`}>{STATUS[s].label}</button>
            ))}
          </div>
          {nextStep && (
            <button onClick={() => setStatus(nextStep[0])} data-testid="status-next-button" className="tap h-14 w-full rounded-xl bg-blue-600 text-lg font-bold text-white shadow-md hover:bg-blue-700">{nextStep[1]}</button>
          )}
        </div>
      )}

      {done && <SharePanel job={job} companyName={me.company.name} />}

      {done && (
        <section className="rounded-2xl border border-slate-300 bg-white p-5" data-testid="payment-panel">
          <h2 className="mb-3 font-heading text-2xl font-bold uppercase">Tahsilat</h2>
          <PayPicker paid={job.paid} method={job.payment_method} prefix="payment" onChange={setPay} />
          <p className="mt-3 text-sm text-slate-600">Tamamlanma: {fmtIso(job.completed_at)}</p>
        </section>
      )}

      {!cancelled && <CompletePanel key={job.status} job={job} onDone={load} />}

      {cancelled && <p className="rounded-2xl bg-rose-50 p-5 font-semibold text-rose-900" data-testid="job-cancelled-note">Bu iş iptal edildi.</p>}

      <div className="flex flex-wrap gap-2 pb-4">
        {(done || cancelled) && (
          <button onClick={() => setStatus("bekliyor")} data-testid="job-reopen-button" className="tap h-12 rounded-xl border-2 border-slate-300 bg-white px-4 font-bold">Yeniden aç</button>
        )}
        {!done && !cancelled && (
          <button onClick={() => setStatus("iptal")} data-testid="job-cancel-button" className="tap h-12 rounded-xl border-2 border-rose-300 bg-white px-4 font-bold text-rose-700">İptal et</button>
        )}
        {me.owner && (
          <Link to={`/app/isler/${job.id}/duzenle`} data-testid="job-edit-button" className="tap flex h-12 items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-4 font-bold"><Pencil className="h-4 w-4" />Düzenle</Link>
        )}
        {me.owner && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button data-testid="job-delete-button" className="tap flex h-12 items-center gap-2 rounded-xl border-2 border-slate-300 bg-white px-4 font-bold text-rose-700"><Trash2 className="h-4 w-4" />Sil</button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>İş silinsin mi?</AlertDialogTitle><AlertDialogDescription>Bu işlem geri alınamaz.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Vazgeç</AlertDialogCancel><AlertDialogAction onClick={del} data-testid="job-delete-confirm">Sil</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}
