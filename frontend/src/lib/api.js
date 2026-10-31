import { useMemo } from "react";
import axios from "axios";
import { useAuth } from "@clerk/react";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function useApi() {
  const { getToken } = useAuth();
  return useMemo(() => {
    const inst = axios.create({ baseURL: API });
    inst.interceptors.request.use(async (cfg) => {
      const token = await getToken();
      if (token) cfg.headers.Authorization = `Bearer ${token}`;
      return cfg;
    });
    return inst;
  }, [getToken]);
}

export const errMsg = (e, fallback = "Bir hata oluştu") => e?.response?.data?.detail || fallback;

export const tl = (n) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(n || 0);

export const fmtDateTime = (s) => {
  if (!s) return "";
  const [d, t] = s.slice(0, 16).split("T");
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}${t ? " " + t : ""}`;
};

export const fmtIso = (iso) =>
  iso ? new Date(iso).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "";

export const timeOf = (s) => (s || "").slice(11, 16);

export const STATUS = {
  bekliyor: { label: "Bekliyor", cls: "bg-amber-100 text-amber-900 border-amber-300", dot: "bg-amber-500" },
  yolda: { label: "Yolda", cls: "bg-blue-100 text-blue-900 border-blue-300", dot: "bg-blue-500" },
  yapiliyor: { label: "Yapılıyor", cls: "bg-violet-100 text-violet-900 border-violet-300", dot: "bg-violet-500" },
  tamamlandi: { label: "Tamamlandı", cls: "bg-emerald-100 text-emerald-900 border-emerald-400", dot: "bg-emerald-500" },
  iptal: { label: "İptal", cls: "bg-rose-100 text-rose-900 border-rose-300", dot: "bg-rose-500" },
};

export const PAY_METHODS = { nakit: "Nakit", kart: "Kart", havale: "Havale/EFT" };

export const waPhone = (p) => {
  let d = (p || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = "90" + d.slice(1);
  if (d.length === 10 && d.startsWith("5")) d = "90" + d;
  return d;
};

export async function shrinkImage(file, max = 1600) {
  if (!file.type.startsWith("image/") || file.type.includes("heic")) return file;
  const bmp = await createImageBitmap(file).catch(() => null);
  if (!bmp) return file;
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.82));
  return blob ? new File([blob], "foto.jpg", { type: "image/jpeg" }) : file;
}
