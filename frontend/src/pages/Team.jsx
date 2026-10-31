import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { UserPlus, Crown, Trash2, Mail, Clock } from "lucide-react";
import { useApi, errMsg } from "@/lib/api";
import { useMe } from "@/lib/me";
import { PageTitle } from "@/components/common";
import { Field, inputCls } from "@/pages/Onboarding";
import { Spinner } from "@/pages/AppGate";
import { Input } from "@/components/ui/input";

export default function Team() {
  const api = useApi();
  const me = useMe();
  const [t, setT] = useState(null);
  const [f, setF] = useState({ name: "", email: "" });
  const [busy, setBusy] = useState(false);
  const load = () => api.get("/team").then((r) => setT(r.data));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const pro = me.company.plan === "pro";

  const invite = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await api.post("/team/invite", f); toast.success("Davet eklendi"); setF({ name: "", email: "" }); load(); }
    catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  };
  const removeInvite = async (id) => { await api.delete(`/team/invite/${id}`); load(); };
  const removeMember = async (uid) => {
    if (!window.confirm("Personel ekipten çıkarılsın mı? Açık işleri atanmamış duruma geçer.")) return;
    await api.delete(`/team/${uid}`); toast.success("Personel çıkarıldı"); load();
  };

  if (!t) return <Spinner />;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageTitle title="Ekip" sub={pro ? `${t.members.filter((m) => m.role === "staff").length + t.invites.length} / 10 personel` : "Ücretsiz plan: sadece siz"} />

      {pro ? (
        <form onSubmit={invite} className="space-y-4 rounded-2xl border-2 border-slate-900 bg-white p-5" data-testid="invite-form">
          <h2 className="font-heading text-2xl font-bold uppercase">Usta ekle</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ad soyad"><Input required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} data-testid="invite-name-input" /></Field>
            <Field label="E-posta"><Input required type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={inputCls} data-testid="invite-email-input" /></Field>
          </div>
          <button disabled={busy} className="tap flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-lg font-bold text-white disabled:opacity-60" data-testid="invite-submit-button"><UserPlus className="h-5 w-5" />Davet et</button>
          <p className="text-sm text-slate-600">Usta, bu e-posta ile SahaCep'e kayıt olunca otomatik olarak ekibinize katılır. Davet linkini WhatsApp'tan iletebilirsiniz: <b>{window.location.origin}/sign-up</b></p>
        </form>
      ) : (
        <Link to="/app/abonelik" data-testid="team-upgrade-banner" className="tap flex items-center gap-3 rounded-2xl bg-yellow-400 p-5 font-semibold text-slate-900">
          <Crown className="h-7 w-7 shrink-0" /> Ustalarınızı eklemek için Pro'ya geçin. 10 personele kadar, sınırsız iş →
        </Link>
      )}

      <section className="space-y-2">
        <h2 className="font-heading text-xl font-bold uppercase text-slate-700">Üyeler</h2>
        {t.members.map((m) => (
          <div key={m.user_id} className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-white p-4" data-testid={`member-${m.user_id}`}>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-slate-900 font-heading text-lg font-bold text-yellow-400">{(m.name || m.email || "?").slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0 flex-1"><p className="truncate font-bold">{m.name || m.email}</p><p className="truncate text-sm text-slate-600">{m.email}</p></div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${m.role === "owner" ? "bg-yellow-400 text-slate-900" : "bg-slate-100 text-slate-800"}`}>{m.role === "owner" ? "Yönetici" : "Usta"}</span>
            {m.role === "staff" && <button onClick={() => removeMember(m.user_id)} aria-label="Çıkar" className="tap grid h-10 w-10 place-items-center rounded-xl text-rose-700 hover:bg-rose-50" data-testid={`member-remove-${m.user_id}`}><Trash2 className="h-5 w-5" /></button>}
          </div>
        ))}
      </section>

      {t.invites.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-heading text-xl font-bold uppercase text-slate-700">Bekleyen davetler</h2>
          {t.invites.map((i) => (
            <div key={i.id} className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-400 bg-white p-4" data-testid={`invite-${i.id}`}>
              <Mail className="h-5 w-5 text-slate-500" />
              <div className="min-w-0 flex-1"><p className="truncate font-bold">{i.name}</p><p className="truncate text-sm text-slate-600">{i.email}</p></div>
              <span className="flex items-center gap-1 text-xs font-bold text-amber-700"><Clock className="h-3.5 w-3.5" />Kayıt bekleniyor</span>
              <button onClick={() => removeInvite(i.id)} aria-label="Daveti sil" className="tap grid h-10 w-10 place-items-center rounded-xl text-rose-700 hover:bg-rose-50" data-testid={`invite-remove-${i.id}`}><Trash2 className="h-5 w-5" /></button>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
