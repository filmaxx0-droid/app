import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Clock, User, ChevronRight } from "lucide-react";
import { useApi, STATUS, tl, fmtDateTime } from "@/lib/api";

export const StatusChip = ({ status, testid }) => {
  const s = STATUS[status] || STATUS.bekliyor;
  return (
    <span data-testid={testid || `status-chip-${status}`} className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${s.cls}`}>
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />{s.label}
    </span>
  );
};

export const PageTitle = ({ title, sub, action }) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3 rise">
    <div>
      <h1 className="font-heading text-4xl font-extrabold uppercase leading-none tracking-tight sm:text-5xl" data-testid="page-title">{title}</h1>
      {sub && <p className="mt-2 text-sm font-medium text-slate-600">{sub}</p>}
    </div>
    {action}
  </div>
);

export const Empty = ({ icon: Icon, text, action, testid = "empty-state" }) => (
  <div data-testid={testid} className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-12 text-center">
    {Icon && <Icon className="h-10 w-10 text-slate-400" />}
    <p className="font-semibold text-slate-700">{text}</p>
    {action}
  </div>
);

export const JobCard = ({ job, showDate = true }) => (
  <Link to={`/app/isler/${job.id}`} data-testid={`job-card-${job.id}`}
    className="tap block rounded-2xl border border-slate-300 bg-white p-4 hover:border-slate-900">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-lg font-bold">{job.job_type}</p>
        <p className="truncate font-semibold text-slate-700">{job.customer_name}</p>
      </div>
      <StatusChip status={job.status} testid={`job-card-status-${job.id}`} />
    </div>
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-slate-600">
      <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{showDate ? fmtDateTime(job.scheduled_at) : job.scheduled_at.slice(11, 16)}</span>
      {job.address && <span className="flex min-w-0 items-center gap-1"><MapPin className="h-4 w-4 shrink-0" /><span className="truncate">{job.address}</span></span>}
      {job.assigned_name && <span className="flex items-center gap-1"><User className="h-4 w-4" />{job.assigned_name}</span>}
    </div>
    <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
      <span className="font-mono text-base font-bold">{tl(job.price)}</span>
      <span className="flex items-center gap-1 text-sm font-bold">
        {job.status === "tamamlandi" && (job.paid ? <span className="text-emerald-700">Ödendi</span> : <span className="text-rose-700">Ödenmedi</span>)}
        <ChevronRight className="h-5 w-5 text-slate-400" />
      </span>
    </div>
  </Link>
);

export function AuthImage({ path, alt, className, onClick, testid }) {
  const api = useApi();
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let u;
    let live = true;
    api.get(`/files/${path}`, { responseType: "blob" }).then((r) => {
      u = URL.createObjectURL(r.data);
      if (live) setUrl(u);
    }).catch(() => {});
    return () => { live = false; if (u) URL.revokeObjectURL(u); };
  }, [api, path]);
  if (!url) return <div className={`${className} animate-pulse bg-slate-200`} />;
  return <img src={url} alt={alt} className={className} onClick={() => onClick?.(url)} data-testid={testid} />;
}
