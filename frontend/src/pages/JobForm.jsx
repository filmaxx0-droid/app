import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { toast } from "sonner";
import { Crown } from "lucide-react";
import { useApi, errMsg } from "@/lib/api";
import { PageTitle } from "@/components/common";
import { Field, inputCls } from "@/pages/Onboarding";
import { Spinner } from "@/pages/AppGate";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CustomerDialog } from "@/pages/Customers";

const JOB_TYPES = ["Kombi bakımı", "Kombi arızası", "Klima montajı", "Klima bakımı", "Beyaz eşya tamiri", "Su tesisatı", "Elektrik arızası", "Temizlik"];

const defaultTime = () => {
  const d = new Date(Date.now() + 3600e3);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:00`;
};

export default function JobForm() {
  const { id } = useParams();
  const api = useApi();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState(null);
  const [team, setTeam] = useState([]);
  const [form, setForm] = useState({ customer_id: "", address: "", job_type: "", description: "", scheduled_at: defaultTime(), assigned_to: "", price: "" });
  const [busy, setBusy] = useState(false);
  const [limitHit, setLimitHit] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }));

  useEffect(() => {
    api.get("/customers").then((r) => setCustomers(r.data));
    api.get("/team").then((r) => setTeam(r.data.members));
    if (id) api.get(`/jobs/${id}`).then(({ data: j }) => setForm({
      customer_id: j.customer_id, address: j.address, job_type: j.job_type, description: j.description || "",
      scheduled_at: j.scheduled_at, assigned_to: j.assigned_to || "", price: String(j.price ?? ""),
    }));
  }, [api, id]);

  const pickCustomer = (cid) => {
    if (!cid) return;
    const c = customers.find((x) => x.id === cid);
    setForm((f) => ({ ...f, customer_id: cid, address: f.address || c?.address || "" }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.customer_id) return toast.error("Müşteri seçin");
    setBusy(true);
    const body = { ...form, price: Number(form.price || 0), assigned_to: form.assigned_to || null };
    try {
      const { data } = id ? await api.put(`/jobs/${id}`, body) : await api.post("/jobs", body);
      toast.success(id ? "İş güncellendi" : "İş oluşturuldu");
      navigate(`/app/isler/${data.id}`, { replace: true });
    } catch (err) {
      if (err?.response?.status === 402) setLimitHit(true);
      toast.error(errMsg(err));
      setBusy(false);
    }
  };

  if (!customers) return <Spinner />;
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title={id ? "İşi düzenle" : "Yeni iş"} />
      {limitHit && (
        <Link to="/app/abonelik" data-testid="job-form-limit-banner" className="tap mb-5 flex items-center gap-3 rounded-2xl bg-yellow-400 p-4 font-semibold text-slate-900">
          <Crown className="h-6 w-6" /> Ücretsiz iş hakkınız doldu. Pro'ya geçerek sınırsız iş açın →
        </Link>
      )}
      <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-300 bg-white p-5 md:p-7" data-testid="job-form">
        <Field label="Müşteri *">
          <div className="flex gap-2">
            <Select value={form.customer_id} onValueChange={pickCustomer}>
              <SelectTrigger className={`${inputCls} flex-1`} data-testid="job-customer-select"><SelectValue placeholder="Müşteri seçin" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => <SelectItem key={c.id} value={c.id} data-testid={`job-customer-option-${c.id}`}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</SelectItem>)}
              </SelectContent>
            </Select>
            <CustomerDialog onSaved={(c) => { setCustomers((l) => [...l, c]); setForm((f) => ({ ...f, customer_id: c.id, address: f.address || c.address })); }}
              trigger={<button type="button" className="tap h-12 shrink-0 rounded-xl border-2 border-slate-900 px-4 font-bold" data-testid="job-new-customer-button">+ Yeni</button>} />
          </div>
        </Field>
        <Field label="İş türü *">
          <Input required list="job-types" value={form.job_type} onChange={set("job_type")} className={inputCls} placeholder="Örn. Kombi bakımı" data-testid="job-type-input" />
          <datalist id="job-types">{JOB_TYPES.map((t) => <option key={t} value={t} />)}</datalist>
          <div className="flex flex-wrap gap-2 pt-1">
            {JOB_TYPES.slice(0, 5).map((t) => (
              <button type="button" key={t} onClick={() => set("job_type")(t)} className="tap rounded-full border border-slate-300 px-3 py-1.5 text-xs font-semibold hover:border-slate-900" data-testid={`job-type-chip-${t}`}>{t}</button>
            ))}
          </div>
        </Field>
        <Field label="Adres"><Input value={form.address} onChange={set("address")} className={inputCls} placeholder="Müşteri adresi kullanılır" data-testid="job-address-input" /></Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Tarih ve saat *"><Input required type="datetime-local" value={form.scheduled_at} onChange={set("scheduled_at")} className={inputCls} data-testid="job-datetime-input" /></Field>
          <Field label="Ücret (₺)"><Input type="number" min="0" step="0.01" inputMode="decimal" value={form.price} onChange={set("price")} className={inputCls} placeholder="0" data-testid="job-price-input" /></Field>
        </div>
        <Field label="Atanan usta">
          <Select value={form.assigned_to || "none"} onValueChange={(v) => set("assigned_to")(v === "none" ? "" : v)}>
            <SelectTrigger className={inputCls} data-testid="job-assignee-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Atanmadı</SelectItem>
              {team.map((m) => <SelectItem key={m.user_id} value={m.user_id} data-testid={`job-assignee-option-${m.user_id}`}>{m.name || m.email}{m.role === "owner" ? " (Ben)" : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Açıklama"><Textarea value={form.description} onChange={set("description")} className="min-h-24 rounded-xl border-slate-300 text-base" placeholder="Arıza, müşteri notu..." data-testid="job-description-input" /></Field>
        <button disabled={busy} className="tap h-14 w-full rounded-xl bg-blue-600 text-lg font-bold text-white hover:bg-blue-700 disabled:opacity-60" data-testid="job-submit-button">
          {busy ? "Kaydediliyor..." : id ? "Kaydet" : "İşi oluştur"}
        </button>
      </form>
    </div>
  );
}
