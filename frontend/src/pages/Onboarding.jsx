import { useState } from "react";
import { toast } from "sonner";
import { UserButton } from "@clerk/react";
import { Building2 } from "lucide-react";
import { useApi, errMsg } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/pages/AuthLayout";

export const Field = ({ label, children }) => (
  <div className="space-y-2">
    <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">{label}</Label>
    {children}
  </div>
);

export const inputCls = "h-12 rounded-xl border-slate-300 bg-white text-base";

export default function Onboarding({ me, onDone }) {
  const api = useApi();
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/company", form);
      toast.success("Firmanız oluşturuldu");
      onDone();
    } catch (err) {
      toast.error(errMsg(err));
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-5"><Logo /><UserButton /></header>
      <div className="mx-auto max-w-lg px-4 py-10">
        <div className="hazard mb-6 h-2 w-24 rounded" />
        <h1 className="font-heading text-5xl font-extrabold uppercase leading-none">Firmanızı oluşturun</h1>
        <p className="mt-3 text-slate-700">Bilgileri servis formunda müşterileriniz görecek. Sonradan değiştirebilirsiniz.</p>
        <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border border-slate-300 bg-white p-6" data-testid="onboarding-form">
          <Field label="Firma adı *"><Input required value={form.name} onChange={set("name")} className={inputCls} placeholder="Örn. Yıldız Teknik Servis" data-testid="onboarding-name-input" /></Field>
          <Field label="Telefon"><Input value={form.phone} onChange={set("phone")} className={inputCls} placeholder="0532 000 00 00" inputMode="tel" data-testid="onboarding-phone-input" /></Field>
          <Field label="Adres"><Input value={form.address} onChange={set("address")} className={inputCls} placeholder="İlçe / Şehir" data-testid="onboarding-address-input" /></Field>
          <button disabled={busy} className="tap flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-lg font-bold text-white hover:bg-blue-700 disabled:opacity-60" data-testid="onboarding-submit-button">
            <Building2 className="h-5 w-5" /> {busy ? "Oluşturuluyor..." : "Firmayı oluştur"}
          </button>
        </form>
        <p className="mt-6 rounded-xl bg-yellow-100 p-4 text-sm font-medium text-slate-800" data-testid="onboarding-staff-hint">
          Usta mısınız? Firma sahibinin sizi davet ettiği e-posta ({me.email || "davet e-postası"}) ile giriş yaptığınızdan emin olun; davet varsa otomatik olarak firmaya bağlanırsınız.
        </p>
      </div>
    </div>
  );
}
