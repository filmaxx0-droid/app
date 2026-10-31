import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Users, Plus, Search, Phone, MapPin, ChevronRight } from "lucide-react";
import { useApi, errMsg } from "@/lib/api";
import { PageTitle, Empty } from "@/components/common";
import { Field, inputCls } from "@/pages/Onboarding";
import { Spinner } from "@/pages/AppGate";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function CustomerDialog({ trigger, initial, onSaved }) {
  const api = useApi();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(initial || { name: "", phone: "", address: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    try {
      const { data } = initial ? await api.put(`/customers/${initial.id}`, f) : await api.post("/customers", f);
      toast.success(initial ? "Müşteri güncellendi" : "Müşteri eklendi");
      onSaved(data);
      setOpen(false);
      if (!initial) setF({ name: "", phone: "", address: "", notes: "" });
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader><DialogTitle className="font-heading text-3xl font-extrabold uppercase">{initial ? "Müşteriyi düzenle" : "Yeni müşteri"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4" data-testid="customer-form">
          <Field label="Ad soyad *"><Input required value={f.name} onChange={set("name")} className={inputCls} data-testid="customer-name-input" /></Field>
          <Field label="Telefon"><Input value={f.phone} onChange={set("phone")} inputMode="tel" className={inputCls} placeholder="0532 000 00 00" data-testid="customer-phone-input" /></Field>
          <Field label="Adres"><Input value={f.address} onChange={set("address")} className={inputCls} data-testid="customer-address-input" /></Field>
          <Field label="Not"><Textarea value={f.notes} onChange={set("notes")} className="rounded-xl border-slate-300" data-testid="customer-notes-input" /></Field>
          <button disabled={busy} className="tap h-14 w-full rounded-xl bg-blue-600 text-lg font-bold text-white disabled:opacity-60" data-testid="customer-submit-button">{busy ? "Kaydediliyor..." : "Kaydet"}</button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Customers() {
  const api = useApi();
  const [list, setList] = useState(null);
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => api.get("/customers", { params: { q } }).then((r) => setList(r.data)), 250);
    return () => clearTimeout(t);
  }, [api, q]);

  return (
    <div>
      <PageTitle title="Müşteriler" sub={list ? `${list.length} kayıt` : ""}
        action={<CustomerDialog onSaved={(c) => setList((l) => [...(l || []), c].sort((a, b) => a.name.localeCompare(b.name, "tr")))}
          trigger={<button className="tap inline-flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-5 font-bold text-white" data-testid="customers-new-button"><Plus className="h-5 w-5" />Yeni müşteri</button>} />} />
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad, telefon veya adres ara" className="h-12 rounded-xl border-slate-300 bg-white pl-12 text-base" data-testid="customers-search-input" />
      </div>
      {!list ? <Spinner /> : list.length === 0 ? <Empty icon={Users} text="Henüz müşteri yok." /> : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.map((c) => (
            <Link key={c.id} to={`/app/musteriler/${c.id}`} data-testid={`customer-card-${c.id}`} className="tap flex items-center gap-3 rounded-2xl border border-slate-300 bg-white p-4 hover:border-slate-900">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-900 font-heading text-xl font-bold text-yellow-400">{c.name.slice(0, 1).toLocaleUpperCase("tr")}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold">{c.name}</p>
                {c.phone && <p className="flex items-center gap-1 text-sm font-medium text-slate-600"><Phone className="h-3.5 w-3.5" />{c.phone}</p>}
                {c.address && <p className="flex items-center gap-1 truncate text-sm text-slate-600"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{c.address}</span></p>}
              </div>
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
