import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, TrendingUp, Wallet, CheckCircle2, Plus, Crown } from "lucide-react";
import { useApi, tl } from "@/lib/api";
import { useMe } from "@/lib/me";
import { PageTitle, JobCard, Empty } from "@/components/common";
import { Spinner } from "@/pages/AppGate";

const Stat = ({ label, value, icon: Icon, tone, testid, to }) => {
  const body = (
    <div className={`tap h-full rounded-2xl border p-4 md:p-5 ${tone}`} data-testid={testid}>
      <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wider opacity-80">{label}</p><Icon className="h-5 w-5 opacity-80" /></div>
      <p className="mt-3 font-heading text-3xl font-extrabold md:text-4xl">{value}</p>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
};

export default function Dashboard() {
  const api = useApi();
  const me = useMe();
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/dashboard").then((r) => setD(r.data)); }, [api]);
  if (!d) return <Spinner />;
  const today = new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div>
      <PageTitle title={me.owner ? "Bugün" : "Bugünkü işlerim"} sub={today}
        action={me.owner && (
          <Link to="/app/isler/yeni" data-testid="dashboard-new-job-button" className="tap hidden h-12 items-center gap-2 rounded-xl bg-blue-600 px-5 font-bold text-white hover:bg-blue-700 md:inline-flex"><Plus className="h-5 w-5" />Yeni iş</Link>
        )} />

      {me.owner && d.job_limit && d.jobs_this_month >= d.job_limit - 3 && (
        <Link to="/app/abonelik" data-testid="dashboard-limit-banner" className="tap mb-5 flex items-center gap-3 rounded-2xl bg-yellow-400 p-4 font-semibold text-slate-900">
          <Crown className="h-6 w-6 shrink-0" />
          {d.jobs_this_month >= d.job_limit ? "Bu ayki ücretsiz iş hakkınız doldu." : `Bu ay ${d.job_limit - d.jobs_this_month} ücretsiz iş hakkınız kaldı.`} Sınırsız iş için Pro'ya geçin →
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4 rise d1">
        <Stat label="Bugünkü işler" value={d.today_jobs.length} icon={CalendarCheck} tone="border-slate-900 bg-slate-900 text-white" testid="stat-today-jobs" />
        <Stat label={me.owner ? "Bu ay ciro" : "Bu ay işler"} value={me.owner ? tl(d.month_revenue) : tl(d.month_revenue)} icon={TrendingUp} tone="border-blue-300 bg-blue-50 text-blue-950" testid="stat-month-revenue" />
        <Stat label="Bekleyen tahsilat" value={tl(d.pending_amount)} icon={Wallet} tone="border-rose-300 bg-rose-50 text-rose-950" testid="stat-pending-amount" to={me.owner ? "/app/tahsilat" : null} />
        <Stat label="Bu ay tamamlanan" value={d.completed_count} icon={CheckCircle2} tone="border-emerald-300 bg-emerald-50 text-emerald-950" testid="stat-completed-count" />
      </div>

      {me.owner && d.job_limit && (
        <p className="mt-3 text-sm font-medium text-slate-600" data-testid="dashboard-usage">Ücretsiz plan: bu ay {d.jobs_this_month} / {d.job_limit} iş</p>
      )}

      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold uppercase">Bugünün programı</h2>
        <Link to="/app/isler" className="text-sm font-bold text-blue-700" data-testid="dashboard-all-jobs-link">Tüm işler ({d.active_count} aktif) →</Link>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 rise d2">
        {d.today_jobs.length === 0 ? (
          <div className="md:col-span-2">
            <Empty icon={CalendarCheck} text="Bugün için planlanmış iş yok."
              action={me.owner && <Link to="/app/isler/yeni" data-testid="empty-new-job-button" className="tap mt-2 inline-flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-5 font-bold text-white"><Plus className="h-5 w-5" />İş ekle</Link>} />
          </div>
        ) : d.today_jobs.map((j) => <JobCard key={j.id} job={j} showDate={false} />)}
      </div>
    </div>
  );
}
