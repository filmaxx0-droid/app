import { Link } from "react-router-dom";
import { Wrench } from "lucide-react";

export const Logo = ({ light = false }) => (
  <Link to="/" data-testid="brand-logo" className="flex items-center gap-2">
    <span className="grid h-9 w-9 place-items-center rounded-lg bg-yellow-400 text-slate-900"><Wrench className="h-5 w-5" strokeWidth={2.5} /></span>
    <span className={`font-heading text-2xl font-extrabold uppercase tracking-tight ${light ? "text-white" : "text-slate-900"}`}>Saha<span className="text-blue-600">Cep</span></span>
  </Link>
);

export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-slate-900 lg:flex lg:flex-col lg:justify-between lg:p-12 grain">
        <Logo light />
        <div>
          <h2 className="font-heading text-5xl font-extrabold uppercase leading-none text-white">İş sahada,<br /><span className="text-yellow-400">kontrol cebinde.</span></h2>
          <p className="mt-4 max-w-md text-slate-300">İş atayın, fotoğraflı servis formu gönderin, tahsilatı kaçırmayın.</p>
        </div>
        <div className="hazard h-3 w-40 rounded" />
      </div>
      <div className="flex flex-col items-center justify-center gap-6 px-4 py-10">
        <div className="lg:hidden"><Logo /></div>
        {children}
      </div>
    </div>
  );
}
