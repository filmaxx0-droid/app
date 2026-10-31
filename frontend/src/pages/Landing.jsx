import { Link } from "react-router-dom";
import { Show } from "@clerk/react";
import { Camera, CheckCircle2, ClipboardList, MessageCircle, Wallet, Users, ArrowRight } from "lucide-react";
import { Logo } from "@/pages/AuthLayout";

const HERO = "https://images.unsplash.com/photo-1621905251918-48416bd8575a?crop=entropy&cs=srgb&fm=jpg&q=80&w=1400";

const FEATURES = [
  { icon: ClipboardList, t: "İş atama", d: "Müşteri, adres, saat ve ustayı seçin. Usta telefonundan anında görür." },
  { icon: Camera, t: "Önce / sonra fotoğraf", d: "Usta sahada fotoğraf çeker, yaptığı işi ve malzemeyi yazar." },
  { icon: MessageCircle, t: "WhatsApp servis formu", d: "Fotoğraflı dijital form tek dokunuşla müşteriye gider." },
  { icon: Wallet, t: "Tahsilat takibi", d: "Nakit, kart, havale. Kimin ne kadar borcu var, bir bakışta." },
];

const CtaButton = ({ testid }) => (
  <>
    <Show when="signed-out">
      <Link to="/sign-up" data-testid={testid} className="tap inline-flex h-14 items-center gap-2 rounded-xl bg-yellow-400 px-7 text-lg font-bold text-slate-900 shadow-lg hover:bg-yellow-300">
        Ücretsiz başla <ArrowRight className="h-5 w-5" />
      </Link>
    </Show>
    <Show when="signed-in">
      <Link to="/app" data-testid={`${testid}-app`} className="tap inline-flex h-14 items-center gap-2 rounded-xl bg-yellow-400 px-7 text-lg font-bold text-slate-900 shadow-lg hover:bg-yellow-300">
        Panele git <ArrowRight className="h-5 w-5" />
      </Link>
    </Show>
  </>
);

function Pricing() {
  const plans = [
    { name: "Ücretsiz", price: "₺0", items: ["1 kullanıcı", "Ayda 15 iş", "Fotoğraflı servis formu", "Tahsilat takibi"] },
    { name: "Pro", price: "₺399", hot: true, items: ["Sınırsız iş", "10 personele kadar", "Firma logolu servis formu", "Tüm özellikler"] },
  ];
  return (
    <section id="fiyat" className="mx-auto max-w-6xl px-5 py-20">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Fiyatlandırma</p>
      <h2 className="mt-2 font-heading text-4xl font-extrabold uppercase sm:text-5xl">Küçük başla, büyüdükçe geç</h2>
      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {plans.map((p) => (
          <div key={p.name} data-testid={`pricing-${p.name}`} className={`relative rounded-2xl border-2 p-7 ${p.hot ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white"}`}>
            {p.hot && <span className="absolute -top-3 left-7 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold uppercase text-slate-900">En çok tercih edilen</span>}
            <p className="font-heading text-2xl font-bold uppercase">{p.name}</p>
            <p className="mt-2 font-heading text-6xl font-extrabold">{p.price}<span className="text-lg font-semibold opacity-70"> / ay</span></p>
            <ul className="mt-6 space-y-3">
              {p.items.map((i) => (
                <li key={i} className="flex items-center gap-3 font-medium"><CheckCircle2 className={`h-5 w-5 ${p.hot ? "text-yellow-400" : "text-emerald-600"}`} />{i}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <div className="bg-slate-50">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <nav className="flex items-center gap-3">
            <a href="#fiyat" className="hidden text-sm font-semibold text-slate-700 hover:text-slate-900 sm:block" data-testid="nav-pricing">Fiyatlar</a>
            <Show when="signed-out">
              <Link to="/sign-in" data-testid="nav-signin" className="tap rounded-lg border-2 border-slate-900 px-4 py-2 text-sm font-bold hover:bg-slate-900 hover:text-white">Giriş yap</Link>
            </Show>
            <Show when="signed-in">
              <Link to="/app" data-testid="nav-app" className="tap rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white">Panel</Link>
            </Show>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden bg-slate-900 grain">
        <img src={HERO} alt="Sahada çalışan teknisyen" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="relative mx-auto grid max-w-6xl gap-10 px-5 py-20 md:py-28 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <span className="rise inline-flex items-center gap-2 rounded-full border border-yellow-400/50 bg-yellow-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-yellow-300">Kombi · Klima · Tesisat · Elektrik · Temizlik</span>
            <h1 className="rise d1 mt-6 font-heading text-5xl font-extrabold uppercase leading-[0.95] text-white sm:text-6xl lg:text-7xl">Saha işlerin<br /><span className="text-yellow-400">cebinde.</span></h1>
            <p className="rise d2 mt-6 max-w-xl text-lg text-slate-200">WhatsApp, defter ve Excel'e son. İşi atayın, usta sahada fotoğrafla kapatsın, müşteriye servis formu gitsin, tahsilatı takip edin.</p>
            <div className="rise d3 mt-8 flex flex-wrap items-center gap-4">
              <CtaButton testid="hero-cta" />
              <span className="text-sm text-slate-300">Kredi kartı gerekmez · Ayda 15 iş ücretsiz</span>
            </div>
          </div>
          <div className="rise d4 hidden self-end lg:block">
            <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur-xl">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Bugünkü işler</p>
              {[["09:30", "Kombi bakımı", "Bekliyor", "bg-amber-400"], ["11:00", "Klima montajı", "Yolda", "bg-blue-400"], ["14:00", "Su kaçağı", "Tamamlandı", "bg-emerald-400"]].map(([t, j, s, c]) => (
                <div key={t} className="mt-3 flex items-center gap-3 rounded-xl bg-white p-3">
                  <span className="font-mono text-sm font-bold text-slate-900">{t}</span>
                  <span className="flex-1 font-semibold text-slate-900">{j}</span>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-slate-700"><span className={`h-2 w-2 rounded-full ${c}`} />{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="hazard h-2" />
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Neler yapabilirsiniz</p>
        <h2 className="mt-2 max-w-2xl font-heading text-4xl font-extrabold uppercase sm:text-5xl">Tek ekip, tek uygulama</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <div key={f.t} className={`rise d${i + 1} rounded-2xl border border-slate-300 bg-white p-6 hover:border-slate-900`} style={{ transition: "border-color .2s" }}>
              <f.icon className="h-8 w-8 text-blue-600" strokeWidth={2.2} />
              <p className="mt-4 font-heading text-2xl font-bold uppercase">{f.t}</p>
              <p className="mt-2 text-slate-700">{f.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex items-center gap-3 rounded-2xl bg-yellow-400 p-6 text-slate-900">
          <Users className="h-8 w-8 shrink-0" />
          <p className="font-semibold">Ustalarınız sadece kendilerine atanan işleri görür. Her firmanın verisi tamamen ayrıdır.</p>
        </div>
      </section>

      <Pricing />

      <section className="bg-slate-900 px-5 py-16 text-center grain relative">
        <h2 className="relative font-heading text-4xl font-extrabold uppercase text-white sm:text-5xl">İlk işini 2 dakikada aç</h2>
        <div className="relative mt-6"><CtaButton testid="footer-cta" /></div>
      </section>
      <footer className="px-5 py-8 text-center text-sm text-slate-600">© {new Date().getFullYear()} SahaCep</footer>
    </div>
  );
}
