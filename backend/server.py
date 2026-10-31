import os
import uuid
import logging
import secrets
from pathlib import Path
from datetime import datetime, timezone, timedelta
from zoneinfo import ZoneInfo
from typing import Optional, Literal

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, Depends, HTTPException, UploadFile, File, Form, Request, Response
from starlette.concurrency import run_in_threadpool
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

try:
    from backend.clerk_auth import clerk_router, require_user
    from backend.storage import put_object, get_object, init_storage, APP_NAME
except ModuleNotFoundError:
    from clerk_auth import clerk_router, require_user
    from storage import put_object, get_object, init_storage, APP_NAME

import certifi
import stripe
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest

stripe.ca_bundle_path = certifi.where()

client = AsyncIOMotorClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]
app = FastAPI()
api = APIRouter(prefix="/api")
logger = logging.getLogger("sahacep")
logging.basicConfig(level=logging.INFO)

TZ = ZoneInfo("Europe/Istanbul")
FREE_JOB_LIMIT = 15
PRO_STAFF_LIMIT = 10
PRO_PRICE = 399.0
PRO_DAYS = 30
STATUSES = ["bekliyor", "yolda", "yapiliyor", "tamamlandi", "iptal"]
PAY_METHODS = ["nakit", "kart", "havale"]
IMG_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
ENV = "live" if os.environ.get("CLERK_PUBLISHABLE_KEY", "").startswith("pk_live_") else "preview"


def now_local():
    return datetime.now(TZ)


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def is_pro(company: dict) -> bool:
    until = company.get("pro_until")
    return bool(until) and datetime.fromisoformat(until) > datetime.now(timezone.utc)


def company_out(c: dict) -> dict:
    return {k: c.get(k) for k in ["id", "name", "phone", "address", "logo_path", "pro_until"]} | {"plan": "pro" if is_pro(c) else "free"}


# ---------- membership ----------
def _clerk_user(user_id: str) -> dict:
    r = requests.get(f"https://api.clerk.com/v1/users/{user_id}", timeout=10,
                     headers={"Authorization": f"Bearer {os.environ['CLERK_SECRET_KEY']}", "User-Agent": "sahacep"})
    r.raise_for_status()
    return r.json()


def _verified_emails(cu: dict) -> list:
    return [e["email_address"].lower() for e in cu.get("email_addresses", [])
            if (e.get("verification") or {}).get("status") == "verified"]


async def current_member(user: dict = Depends(require_user)) -> dict:
    uid = user["user_id"]
    member = await db.members.find_one({"user_id": uid}, {"_id": 0})
    if member is None:
        cu = await run_in_threadpool(_clerk_user, uid)
        emails = _verified_emails(cu)
        name = " ".join(filter(None, [cu.get("first_name"), cu.get("last_name")])) or (emails[0] if emails else "")
        invite = await db.invites.find_one({"email": {"$in": emails}}, {"_id": 0}) if emails else None
        if invite:
            member = {"user_id": uid, "company_id": invite["company_id"], "role": "staff",
                      "name": invite.get("name") or name, "email": invite["email"], "env": ENV, "created_at": now_iso()}
            await db.members.update_one({"user_id": uid}, {"$setOnInsert": member}, upsert=True)
            await db.invites.delete_one({"id": invite["id"]})
            member = await db.members.find_one({"user_id": uid}, {"_id": 0})
        else:
            return {"user_id": uid, "company_id": None, "role": None, "name": name, "email": emails[0] if emails else ""}
    return member


async def require_company(member: dict = Depends(current_member)) -> dict:
    if not member.get("company_id"):
        raise HTTPException(409, "Önce firma oluşturun")
    company = await db.companies.find_one({"id": member["company_id"]}, {"_id": 0})
    if not company:
        raise HTTPException(409, "Firma bulunamadı")
    return {**member, "company": company}


async def require_owner(ctx: dict = Depends(require_company)) -> dict:
    if ctx["role"] != "owner":
        raise HTTPException(403, "Bu işlem için yetkiniz yok")
    return ctx


# ---------- models ----------
class CompanyIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field("", max_length=40)
    address: str = Field("", max_length=300)


class InviteIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    email: str = Field(min_length=3, max_length=200)


class CustomerIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    phone: str = Field("", max_length=40)
    address: str = Field("", max_length=300)
    notes: str = Field("", max_length=1000)


class JobIn(BaseModel):
    customer_id: str
    address: str = Field("", max_length=300)
    job_type: str = Field(min_length=1, max_length=120)
    description: str = Field("", max_length=2000)
    scheduled_at: str = Field(min_length=10, max_length=16)  # local "YYYY-MM-DDTHH:MM"
    assigned_to: Optional[str] = None
    price: float = Field(0, ge=0, le=10_000_000)


class StatusIn(BaseModel):
    status: Literal["bekliyor", "yolda", "yapiliyor", "tamamlandi", "iptal"]


class PaymentIn(BaseModel):
    paid: bool
    payment_method: Optional[Literal["nakit", "kart", "havale"]] = None


class CompleteIn(BaseModel):
    work_notes: str = Field("", max_length=3000)
    materials: str = Field("", max_length=2000)
    paid: bool = False
    payment_method: Optional[Literal["nakit", "kart", "havale"]] = None


class CheckoutIn(BaseModel):
    origin_url: str


# ---------- me / company ----------
@api.get("/me")
async def me(member: dict = Depends(current_member)):
    company = await db.companies.find_one({"id": member["company_id"]}, {"_id": 0}) if member.get("company_id") else None
    return {"user_id": member["user_id"], "name": member.get("name"), "email": member.get("email"),
            "role": member.get("role"), "company": company_out(company) if company else None}


@api.post("/company")
async def create_company(body: CompanyIn, member: dict = Depends(current_member)):
    if member.get("company_id"):
        raise HTTPException(409, "Zaten bir firmaya bağlısınız")
    company = {"id": str(uuid.uuid4()), "owner_id": member["user_id"], **body.model_dump(),
               "logo_path": None, "pro_until": None, "created_at": now_iso()}
    await db.companies.insert_one(dict(company))
    await db.members.update_one({"user_id": member["user_id"]}, {"$set": {
        "user_id": member["user_id"], "company_id": company["id"], "role": "owner", "name": member.get("name") or body.name,
        "email": member.get("email", ""), "env": ENV, "created_at": now_iso()}}, upsert=True)
    return company_out(company)


@api.put("/company")
async def update_company(body: CompanyIn, ctx: dict = Depends(require_owner)):
    await db.companies.update_one({"id": ctx["company_id"]}, {"$set": body.model_dump()})
    return company_out(await db.companies.find_one({"id": ctx["company_id"]}, {"_id": 0}))


async def _store_image(file: UploadFile, folder: str) -> tuple[str, str]:
    ctype = (file.content_type or "").lower()
    if ctype not in IMG_TYPES:
        raise HTTPException(400, "Sadece fotoğraf yüklenebilir")
    data = await file.read()
    if len(data) > 12 * 1024 * 1024:
        raise HTTPException(400, "Fotoğraf en fazla 12 MB olabilir")
    ext = ctype.split("/")[-1].replace("jpeg", "jpg")
    path = f"{APP_NAME}/{folder}/{uuid.uuid4()}.{ext}"
    result = await run_in_threadpool(put_object, path, data, ctype)
    return result["path"], ctype


@api.post("/company/logo")
async def upload_logo(file: UploadFile = File(...), ctx: dict = Depends(require_owner)):
    path, ctype = await _store_image(file, f"logos/{ctx['company_id']}")
    await db.files.insert_one({"id": str(uuid.uuid4()), "storage_path": path, "company_id": ctx["company_id"],
                               "content_type": ctype, "is_deleted": False, "created_at": now_iso()})
    await db.companies.update_one({"id": ctx["company_id"]}, {"$set": {"logo_path": path}})
    return {"logo_path": path}


@api.get("/files/{path:path}")
async def download_file(path: str, ctx: dict = Depends(require_company)):
    record = await db.files.find_one({"storage_path": path, "company_id": ctx["company_id"], "is_deleted": False})
    if not record:
        raise HTTPException(404, "Dosya bulunamadı")
    data, _ = await run_in_threadpool(get_object, path)
    return Response(content=data, media_type=record["content_type"], headers={"Cache-Control": "private, max-age=86400"})


# ---------- team ----------
@api.get("/team")
async def list_team(ctx: dict = Depends(require_company)):
    members = await db.members.find({"company_id": ctx["company_id"]}, {"_id": 0, "user_id": 1, "name": 1, "email": 1, "role": 1}).to_list(100)
    invites = await db.invites.find({"company_id": ctx["company_id"]}, {"_id": 0}).to_list(100) if ctx["role"] == "owner" else []
    return {"members": members, "invites": invites}


@api.post("/team/invite")
async def invite(body: InviteIn, ctx: dict = Depends(require_owner)):
    email = body.email.strip().lower()
    if "@" not in email:
        raise HTTPException(400, "Geçerli bir e-posta girin")
    if not is_pro(ctx["company"]):
        raise HTTPException(402, "Ücretsiz planda personel eklenemez. Pro'ya geçin.")
    staff = await db.members.count_documents({"company_id": ctx["company_id"], "role": "staff"})
    pending = await db.invites.count_documents({"company_id": ctx["company_id"]})
    if staff + pending >= PRO_STAFF_LIMIT:
        raise HTTPException(402, f"En fazla {PRO_STAFF_LIMIT} personel eklenebilir")
    if await db.members.find_one({"email": email}) or await db.invites.find_one({"email": email}):
        raise HTTPException(409, "Bu e-posta zaten kayıtlı veya davet edilmiş")
    inv = {"id": str(uuid.uuid4()), "company_id": ctx["company_id"], "name": body.name.strip(), "email": email, "created_at": now_iso()}
    await db.invites.insert_one(dict(inv))
    return inv


@api.delete("/team/invite/{invite_id}")
async def delete_invite(invite_id: str, ctx: dict = Depends(require_owner)):
    if (await db.invites.delete_one({"id": invite_id, "company_id": ctx["company_id"]})).deleted_count == 0:
        raise HTTPException(404, "Bulunamadı")
    return {"ok": True}


@api.delete("/team/{user_id}")
async def remove_member(user_id: str, ctx: dict = Depends(require_owner)):
    res = await db.members.delete_one({"user_id": user_id, "company_id": ctx["company_id"], "role": "staff"})
    if res.deleted_count == 0:
        raise HTTPException(404, "Bulunamadı")
    await db.jobs.update_many({"company_id": ctx["company_id"], "assigned_to": user_id, "status": {"$nin": ["tamamlandi", "iptal"]}},
                              {"$set": {"assigned_to": None, "assigned_name": None}})
    return {"ok": True}


# ---------- customers ----------
@api.get("/customers")
async def list_customers(q: str = "", ctx: dict = Depends(require_owner)):
    query = {"company_id": ctx["company_id"]}
    if q:
        import re
        rx = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [{"name": rx}, {"phone": rx}, {"address": rx}]
    return await db.customers.find(query, {"_id": 0}).sort("name", 1).to_list(1000)


@api.post("/customers")
async def create_customer(body: CustomerIn, ctx: dict = Depends(require_owner)):
    c = {"id": str(uuid.uuid4()), "company_id": ctx["company_id"], **body.model_dump(), "created_at": now_iso()}
    await db.customers.insert_one(dict(c))
    return c


@api.get("/customers/{cid}")
async def get_customer(cid: str, ctx: dict = Depends(require_owner)):
    c = await db.customers.find_one({"id": cid, "company_id": ctx["company_id"]}, {"_id": 0})
    if not c:
        raise HTTPException(404, "Müşteri bulunamadı")
    jobs = await db.jobs.find({"customer_id": cid, "company_id": ctx["company_id"]}, {"_id": 0}).sort("scheduled_at", -1).to_list(500)
    return {**c, "jobs": jobs}


@api.put("/customers/{cid}")
async def update_customer(cid: str, body: CustomerIn, ctx: dict = Depends(require_owner)):
    res = await db.customers.update_one({"id": cid, "company_id": ctx["company_id"]}, {"$set": body.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Müşteri bulunamadı")
    await db.jobs.update_many({"customer_id": cid, "company_id": ctx["company_id"]},
                              {"$set": {"customer_name": body.name, "customer_phone": body.phone}})
    return await db.customers.find_one({"id": cid}, {"_id": 0})


@api.delete("/customers/{cid}")
async def delete_customer(cid: str, ctx: dict = Depends(require_owner)):
    if await db.jobs.find_one({"customer_id": cid, "company_id": ctx["company_id"]}):
        raise HTTPException(409, "Bu müşterinin işleri var, silinemez")
    if (await db.customers.delete_one({"id": cid, "company_id": ctx["company_id"]})).deleted_count == 0:
        raise HTTPException(404, "Müşteri bulunamadı")
    return {"ok": True}


# ---------- jobs ----------
def job_scope(ctx: dict) -> dict:
    scope = {"company_id": ctx["company_id"]}
    if ctx["role"] != "owner":
        scope["assigned_to"] = ctx["user_id"]
    return scope


async def get_job_or_404(jid: str, ctx: dict) -> dict:
    job = await db.jobs.find_one({"id": jid, **job_scope(ctx)}, {"_id": 0})
    if not job:
        raise HTTPException(404, "İş bulunamadı")
    return job


async def jobs_this_month(company_id: str) -> int:
    return await db.jobs.count_documents({"company_id": company_id, "created_month": now_local().strftime("%Y-%m")})


async def _resolve_job_refs(body: JobIn, ctx: dict) -> dict:
    cust = await db.customers.find_one({"id": body.customer_id, "company_id": ctx["company_id"]}, {"_id": 0})
    if not cust:
        raise HTTPException(400, "Müşteri bulunamadı")
    assigned_name = None
    if body.assigned_to:
        m = await db.members.find_one({"user_id": body.assigned_to, "company_id": ctx["company_id"]}, {"_id": 0})
        if not m:
            raise HTTPException(400, "Personel bulunamadı")
        assigned_name = m.get("name")
    try:
        datetime.fromisoformat(body.scheduled_at)
    except ValueError:
        raise HTTPException(400, "Geçersiz tarih")
    data = body.model_dump()
    data.update(address=body.address or cust.get("address", ""), customer_name=cust["name"],
                customer_phone=cust.get("phone", ""), assigned_name=assigned_name)
    return data


@api.get("/jobs")
async def list_jobs(status: str = "", scope: str = "", ctx: dict = Depends(require_company)):
    query = job_scope(ctx)
    if status in STATUSES:
        query["status"] = status
    elif status == "aktif":
        query["status"] = {"$in": ["bekliyor", "yolda", "yapiliyor"]}
    if scope == "today":
        query["scheduled_at"] = {"$regex": "^" + now_local().strftime("%Y-%m-%d")}
    sort = 1 if scope == "today" or status == "aktif" else -1
    return await db.jobs.find(query, {"_id": 0}).sort("scheduled_at", sort).to_list(1000)


@api.post("/jobs")
async def create_job(body: JobIn, ctx: dict = Depends(require_owner)):
    if not is_pro(ctx["company"]) and await jobs_this_month(ctx["company_id"]) >= FREE_JOB_LIMIT:
        raise HTTPException(402, f"Ücretsiz planda ayda {FREE_JOB_LIMIT} iş açılabilir. Sınırsız iş için Pro'ya geçin.")
    data = await _resolve_job_refs(body, ctx)
    job = {"id": str(uuid.uuid4()), "company_id": ctx["company_id"], **data, "status": "bekliyor",
           "work_notes": "", "materials": "", "photos": [], "paid": False, "payment_method": None,
           "public_token": secrets.token_urlsafe(16), "completed_at": None, "completed_month": None,
           "created_month": now_local().strftime("%Y-%m"), "created_at": now_iso()}
    await db.jobs.insert_one(dict(job))
    return job


@api.get("/jobs/{jid}")
async def get_job(jid: str, ctx: dict = Depends(require_company)):
    return await get_job_or_404(jid, ctx)


@api.put("/jobs/{jid}")
async def update_job(jid: str, body: JobIn, ctx: dict = Depends(require_owner)):
    await get_job_or_404(jid, ctx)
    data = await _resolve_job_refs(body, ctx)
    await db.jobs.update_one({"id": jid, "company_id": ctx["company_id"]}, {"$set": data})
    return await get_job_or_404(jid, ctx)


@api.delete("/jobs/{jid}")
async def delete_job(jid: str, ctx: dict = Depends(require_owner)):
    if (await db.jobs.delete_one({"id": jid, "company_id": ctx["company_id"]})).deleted_count == 0:
        raise HTTPException(404, "İş bulunamadı")
    return {"ok": True}


def _completion_fields(status: str) -> dict:
    if status == "tamamlandi":
        return {"completed_at": now_iso(), "completed_month": now_local().strftime("%Y-%m")}
    return {"completed_at": None, "completed_month": None}


@api.patch("/jobs/{jid}/status")
async def set_status(jid: str, body: StatusIn, ctx: dict = Depends(require_company)):
    job = await get_job_or_404(jid, ctx)
    update = {"status": body.status}
    if (body.status == "tamamlandi") != (job["status"] == "tamamlandi"):
        update |= _completion_fields(body.status)
    await db.jobs.update_one({"id": jid}, {"$set": update})
    return await get_job_or_404(jid, ctx)


@api.post("/jobs/{jid}/complete")
async def complete_job(jid: str, body: CompleteIn, ctx: dict = Depends(require_company)):
    job = await get_job_or_404(jid, ctx)
    if job["status"] == "iptal":
        raise HTTPException(400, "İptal edilmiş iş tamamlanamaz")
    update = {"work_notes": body.work_notes, "materials": body.materials, "paid": body.paid,
              "payment_method": body.payment_method if body.paid else None, "status": "tamamlandi"}
    if job["status"] != "tamamlandi":
        update |= _completion_fields("tamamlandi")
    await db.jobs.update_one({"id": jid}, {"$set": update})
    return await get_job_or_404(jid, ctx)


@api.patch("/jobs/{jid}/payment")
async def set_payment(jid: str, body: PaymentIn, ctx: dict = Depends(require_company)):
    await get_job_or_404(jid, ctx)
    await db.jobs.update_one({"id": jid}, {"$set": {"paid": body.paid, "payment_method": body.payment_method if body.paid else None}})
    return await get_job_or_404(jid, ctx)


@api.post("/jobs/{jid}/photos")
async def add_photo(jid: str, kind: Literal["once", "sonra"] = Form(...), file: UploadFile = File(...), ctx: dict = Depends(require_company)):
    job = await get_job_or_404(jid, ctx)
    if len(job.get("photos", [])) >= 20:
        raise HTTPException(400, "Bir işe en fazla 20 fotoğraf eklenebilir")
    path, ctype = await _store_image(file, f"jobs/{ctx['company_id']}/{jid}")
    photo = {"id": str(uuid.uuid4()), "kind": kind, "path": path, "created_at": now_iso()}
    await db.files.insert_one({"id": photo["id"], "storage_path": path, "company_id": ctx["company_id"], "job_id": jid,
                               "content_type": ctype, "is_deleted": False, "created_at": now_iso()})
    await db.jobs.update_one({"id": jid}, {"$push": {"photos": photo}})
    return photo


@api.delete("/jobs/{jid}/photos/{pid}")
async def delete_photo(jid: str, pid: str, ctx: dict = Depends(require_company)):
    await get_job_or_404(jid, ctx)
    await db.jobs.update_one({"id": jid}, {"$pull": {"photos": {"id": pid}}})
    await db.files.update_one({"id": pid, "company_id": ctx["company_id"]}, {"$set": {"is_deleted": True}})
    return {"ok": True}


# ---------- dashboard / receivables ----------
@api.get("/dashboard")
async def dashboard(ctx: dict = Depends(require_company)):
    scope = job_scope(ctx)
    today = now_local().strftime("%Y-%m-%d")
    month = now_local().strftime("%Y-%m")
    today_jobs = await db.jobs.find({**scope, "scheduled_at": {"$regex": "^" + today}}, {"_id": 0}).sort("scheduled_at", 1).to_list(200)
    done_month = await db.jobs.find({**scope, "status": "tamamlandi", "completed_month": month}, {"_id": 0, "price": 1, "paid": 1}).to_list(10000)
    unpaid = await db.jobs.find({**scope, "status": "tamamlandi", "paid": False}, {"_id": 0, "price": 1}).to_list(10000)
    active = await db.jobs.count_documents({**scope, "status": {"$in": ["bekliyor", "yolda", "yapiliyor"]}})
    return {"today_jobs": today_jobs, "month_revenue": sum(j.get("price", 0) for j in done_month),
            "month_collected": sum(j.get("price", 0) for j in done_month if j.get("paid")),
            "pending_amount": sum(j.get("price", 0) for j in unpaid), "pending_count": len(unpaid),
            "completed_count": len(done_month), "active_count": active,
            "jobs_this_month": await jobs_this_month(ctx["company_id"]),
            "job_limit": None if is_pro(ctx["company"]) else FREE_JOB_LIMIT}


@api.get("/receivables")
async def receivables(ctx: dict = Depends(require_owner)):
    return await db.jobs.find({"company_id": ctx["company_id"], "status": "tamamlandi", "paid": False}, {"_id": 0}).sort("completed_at", -1).to_list(1000)


# ---------- public service form ----------
async def _public_job(token: str) -> dict:
    job = await db.jobs.find_one({"public_token": token, "status": "tamamlandi"}, {"_id": 0})
    if not job:
        raise HTTPException(404, "Servis formu bulunamadı")
    return job


@api.get("/public/form/{token}")
async def public_form(token: str):
    job = await _public_job(token)
    c = await db.companies.find_one({"id": job["company_id"]}, {"_id": 0})
    keep = ["job_type", "description", "scheduled_at", "completed_at", "customer_name", "address", "assigned_name",
            "price", "paid", "payment_method", "work_notes", "materials"]
    return {"job": {k: job.get(k) for k in keep} | {"photos": [{"id": p["id"], "kind": p["kind"]} for p in job.get("photos", [])],
                                                    "number": job["id"][:8].upper()},
            "company": {"name": c["name"], "phone": c.get("phone"), "address": c.get("address"),
                        "has_logo": bool(c.get("logo_path")) and is_pro(c)}}


@api.get("/public/form/{token}/photo/{pid}")
async def public_photo(token: str, pid: str):
    job = await _public_job(token)
    photo = next((p for p in job.get("photos", []) if p["id"] == pid), None)
    if not photo:
        raise HTTPException(404, "Fotoğraf bulunamadı")
    data, ctype = await run_in_threadpool(get_object, photo["path"])
    return Response(content=data, media_type=ctype, headers={"Cache-Control": "public, max-age=86400"})


@api.get("/public/form/{token}/logo")
async def public_logo(token: str):
    job = await _public_job(token)
    c = await db.companies.find_one({"id": job["company_id"]}, {"_id": 0})
    if not c.get("logo_path") or not is_pro(c):
        raise HTTPException(404, "Logo yok")
    data, ctype = await run_in_threadpool(get_object, c["logo_path"])
    return Response(content=data, media_type=ctype, headers={"Cache-Control": "public, max-age=3600"})


# ---------- billing (Stripe test mode) ----------
def _stripe(request: Request) -> StripeCheckout:
    return StripeCheckout(api_key=os.environ["STRIPE_API_KEY"], webhook_url=f"{str(request.base_url)}api/webhook/stripe")


@api.get("/billing")
async def billing(ctx: dict = Depends(require_company)):
    staff = await db.members.count_documents({"company_id": ctx["company_id"], "role": "staff"})
    return {"plan": "pro" if is_pro(ctx["company"]) else "free", "pro_until": ctx["company"].get("pro_until"),
            "jobs_this_month": await jobs_this_month(ctx["company_id"]), "free_job_limit": FREE_JOB_LIMIT,
            "staff_count": staff, "staff_limit": PRO_STAFF_LIMIT, "price": PRO_PRICE}


@api.post("/billing/checkout")
async def checkout(body: CheckoutIn, request: Request, ctx: dict = Depends(require_owner)):
    origin = body.origin_url.rstrip("/")
    req = CheckoutSessionRequest(amount=PRO_PRICE, currency="try",
                                 success_url=f"{origin}/app/odeme/basarili?session_id={{CHECKOUT_SESSION_ID}}",
                                 cancel_url=f"{origin}/app/abonelik",
                                 metadata={"company_id": ctx["company_id"], "user_id": ctx["user_id"], "plan": "pro_monthly"})
    session = await _stripe(request).create_checkout_session(req)
    await db.payment_transactions.insert_one({"session_id": session.session_id, "company_id": ctx["company_id"],
                                              "user_id": ctx["user_id"], "amount": PRO_PRICE, "currency": "try",
                                              "status": "initiated", "payment_status": "pending", "applied": False,
                                              "created_at": now_iso(), "updated_at": now_iso()})
    return {"url": session.url, "session_id": session.session_id}


async def _apply_paid(session_id: str):
    tx = await db.payment_transactions.find_one_and_update(
        {"session_id": session_id, "applied": False},
        {"$set": {"applied": True, "status": "completed", "payment_status": "paid", "updated_at": now_iso()}})
    if not tx:
        return
    c = await db.companies.find_one({"id": tx["company_id"]}, {"_id": 0})
    base = datetime.fromisoformat(c["pro_until"]) if is_pro(c) else datetime.now(timezone.utc)
    await db.companies.update_one({"id": tx["company_id"]}, {"$set": {"pro_until": (base + timedelta(days=PRO_DAYS)).isoformat()}})


@api.get("/payments/status/{session_id}")
async def payment_status(session_id: str, request: Request):
    tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not tx:
        raise HTTPException(404, "Ödeme bulunamadı")
    if tx["payment_status"] != "paid":
        st = await _stripe(request).get_checkout_status(session_id)
        if st.payment_status == "paid":
            await _apply_paid(session_id)
        elif st.status == "expired":
            await db.payment_transactions.update_one({"session_id": session_id, "payment_status": {"$ne": "paid"}},
                                                     {"$set": {"status": "expired", "payment_status": "expired", "updated_at": now_iso()}})
        tx = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    return {"session_id": session_id, "status": tx["status"], "payment_status": tx["payment_status"]}


@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    try:
        ev = await _stripe(request).handle_webhook(body, request.headers.get("Stripe-Signature"))
    except Exception:
        raise HTTPException(400, "Geçersiz webhook")
    if ev.payment_status == "paid" and ev.session_id:
        await _apply_paid(ev.session_id)
    return {"ok": True}


@app.on_event("startup")
async def startup():
    await db.jobs.create_index([("company_id", 1), ("scheduled_at", 1)])
    await db.jobs.create_index("public_token")
    await db.members.create_index("user_id", unique=True)
    try:
        await run_in_threadpool(init_storage)
    except Exception as e:
        logger.error(f"Storage init failed: {e}")


@app.on_event("shutdown")
async def shutdown():
    client.close()


app.include_router(api)
app.include_router(clerk_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
                   allow_methods=["*"], allow_headers=["*"])
