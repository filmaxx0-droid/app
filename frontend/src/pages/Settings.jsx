import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Upload, Loader2, Crown, ImageIcon } from "lucide-react";
import { useApi, errMsg, shrinkImage } from "@/lib/api";
import { useMe } from "@/lib/me";
import { PageTitle, AuthImage } from "@/components/common";
import { Field, inputCls } from "@/pages/Onboarding";
import { Input } from "@/components/ui/input";

export default function Settings() {
  const api = useApi();
  const me = useMe();
  const c = me.company;
  const [f, setF] = useState({ name: c.name, phone: c.phone || "", address: c.address || "" });
  const [busy, setBusy] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const ref = useRef();
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await api.put("/company", f); toast.success("Firma bilgileri kaydedildi"); me.refresh(); }
    catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  };
  const uploadLogo = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setLogoBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", await shrinkImage(file, 600));
      await api.post("/company/logo", fd);
      toast.success("Logo yüklendi");
      me.refresh();
    } catch (err) { toast.error(errMsg(err)); }
    setLogoBusy(false);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageTitle title="Firma" sub="Servis formunda görünen bilgiler" />
      <div className="flex items-center gap-4 rounded-2xl border border-slate-300 bg-white p-5" data-testid="logo-section">
        <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-300 bg-slate-50">
          {c.logo_path ? <AuthImage key={c.logo_path} path={c.logo_path} alt="Logo" className="h-full w-full object-contain" testid="company-logo-image" /> : <ImageIcon className="h-8 w-8 text-slate-400" />}
        </div>
        <div className="flex-1 space-y-2">
          <button onClick={() => ref.current.click()} disabled={logoBusy} data-testid="logo-upload-button" className="tap flex h-12 items-center gap-2 rounded-xl border-2 border-slate-900 px-4 font-bold">
            {logoBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}Logo yükle
          </button>
          {c.plan !== "pro" && <Link to="/app/abonelik" className="flex items-center gap-1 text-sm font-semibold text-amber-700" data-testid="logo-pro-hint"><Crown className="h-4 w-4" />Logo servis formunda Pro planla görünür</Link>}
        </div>
        <input ref={ref} type="file" accept="image/*" hidden onChange={uploadLogo} data-testid="logo-file-input" />
      </div>
      <form onSubmit={save} className="space-y-5 rounded-2xl border border-slate-300 bg-white p-5" data-testid="company-form">
        <Field label="Firma adı"><Input required value={f.name} onChange={set("name")} className={inputCls} data-testid="company-name-input" /></Field>
        <Field label="Telefon"><Input value={f.phone} onChange={set("phone")} className={inputCls} data-testid="company-phone-input" /></Field>
        <Field label="Adres"><Input value={f.address} onChange={set("address")} className={inputCls} data-testid="company-address-input" /></Field>
        <button disabled={busy} className="tap h-14 w-full rounded-xl bg-blue-600 text-lg font-bold text-white disabled:opacity-60" data-testid="company-save-button">{busy ? "Kaydediliyor..." : "Kaydet"}</button>
      </form>
    </div>
  );
}
