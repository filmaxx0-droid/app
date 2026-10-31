import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClipboardList, Plus, Search } from "lucide-react";
import { useApi, tl, fmtDateTime } from "@/lib/api";
import { useMe } from "@/lib/me";
import { PageTitle, JobCard, Empty, StatusChip } from "@/components/common";
import { Spinner } from "@/pages/AppGate";
import { Input } from "@/components/ui/input";

const FILTERS = [
  ["aktif", "Aktif"], ["", "Tümü"], ["bekliyor", "Bekliyor"], ["yolda", "Yolda"], ["yapiliyor", "Yapılıyor"], ["tamamlandi", "Tamamlandı"], ["iptal", "İptal"],
];

function JobsTable({ jobs }) {
  const navigate = useNavigate();
  return (
    <div className="hidden overflow-x-auto rounded-2xl border border-slate-300 bg-white md:block">
      <table className="w-full text-left text-sm" data-testid="jobs-table">
        <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-200">
          <tr>{["Tarih", "İş", "Müşteri", "Usta", "Durum", "Ücret", "Ödeme"].map((h) => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {jobs.map((j) => (
            <tr key={j.id} onClick={() => navigate(`/app/isler/${j.id}`)} data-testid={`jobs-row-${j.id}`} className="cursor-pointer border-t border-slate-200 hover:bg-yellow-50" style={{ transition: "background-color .15s" }}>
              <td className="whitespace-nowrap px-4 py-3 font-mono font-semibold">{fmtDateTime(j.scheduled_at)}</td>
              <td className="px-4 py-3 font-bold">{j.job_type}</td>
              <td className="px-4 py-3">{j.customer_name}</td>
              <td className="px-4 py-3">{j.assigned_name || <span className="text-slate-400">—</span>}</td>
              <td className="px-4 py-3"><StatusChip status={j.status} testid={`jobs-row-status-${j.id}`} /></td>
              <td className="whitespace-nowrap px-4 py-3 font-mono font-bold">{tl(j.price)}</td>
              <td className="px-4 py-3 font-semibold">{j.status !== "tamamlandi" ? <span className="text-slate-400">—</span> : j.paid ? <span className="text-emerald-700">Ödendi</span> : <span className="text-rose-700">Ödenmedi</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Jobs() {
  const api = useApi();
  const me = useMe();
  const [status, setStatus] = useState("aktif");
  const [q, setQ] = useState("");
  const [jobs, setJobs] = useState(null);
  useEffect(() => { setJobs(null); api.get("/jobs", { params: { status } }).then((r) => setJobs(r.data)); }, [api, status]);

  const shown = (jobs || []).filter((j) => !q || `${j.customer_name} ${j.job_type} ${j.address} ${j.assigned_name || ""}`.toLocaleLowerCase("tr").includes(q.toLocaleLowerCase("tr")));

  return (
    <div>
      <PageTitle title={me.owner ? "İşler" : "İşlerim"}
        action={me.owner && <Link to="/app/isler/yeni" data-testid="jobs-new-button" className="tap inline-flex h-12 items-center gap-2 rounded-xl bg-blue-600 px-5 font-bold text-white hover:bg-blue-700"><Plus className="h-5 w-5" />Yeni iş</Link>} />
      <div className="relative mb-3">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Müşteri, iş veya adres ara" className="h-12 rounded-xl border-slate-300 bg-white pl-12 text-base" data-testid="jobs-search-input" />
      </div>
      <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map(([v, l]) => (
          <button key={v || "all"} onClick={() => setStatus(v)} data-testid={`jobs-filter-${v || "all"}`}
            className={`tap h-11 shrink-0 rounded-full border-2 px-4 text-sm font-bold ${status === v ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-800"}`}>{l}</button>
        ))}
      </div>
      {!jobs ? <Spinner /> : shown.length === 0 ? (
        <Empty icon={ClipboardList} text="Bu filtrede iş yok." />
      ) : (
        <>
          <div className="grid gap-3 md:hidden">{shown.map((j) => <JobCard key={j.id} job={j} />)}</div>
          <JobsTable jobs={shown} />
        </>
      )}
    </div>
  );
}
