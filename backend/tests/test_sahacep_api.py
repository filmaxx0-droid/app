# SahaCep backend regression tests: auth/me, company, customers, jobs, free limit, team/staff, photos, public form, dashboard, billing
# Prereq: python tests/clerk_test_users.py ticket  (writes /tmp/clerk_tokens.json)
import os, io, json, asyncio, struct, zlib
from datetime import datetime, timezone, timedelta
import pytest, requests
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv("/app/frontend/.env")
load_dotenv("/app/backend/.env")
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
API = BASE_URL + "/api"
TOK = json.load(open("/tmp/clerk_tokens.json"))


def H(who):
    return {"Authorization": f"Bearer {TOK[who]['token']}"}


def run(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def dbop(fn):
    async def _w():
        c = AsyncIOMotorClient(os.environ["MONGO_URL"])
        try:
            return await fn(c[os.environ["DB_NAME"]])
        finally:
            c.close()
    return run(_w())


def png_bytes():
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    raw = b"\x00\xff\x00\x00"
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")


S = {}  # shared state
OWNER_CO = None


@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    staff_id, other_id = TOK["staff"]["user_id"], TOK["other"]["user_id"]

    async def _c(db):
        await db.jobs.delete_many({"job_type": {"$regex": "^TEST_"}})
        await db.customers.delete_many({"name": {"$regex": "^TEST_"}})
        await db.members.delete_many({"user_id": {"$in": [staff_id, other_id]}})
        await db.invites.delete_many({"email": TOK["staff"]["email"]})
        await db.companies.delete_many({"owner_id": other_id})
        await db.companies.update_many({"owner_id": TOK["owner"]["user_id"]}, {"$set": {"pro_until": None}})
    dbop(_c)


# --- auth / me ---
class TestAuthMe:
    def test_no_token_401(self):
        assert requests.get(f"{API}/me").status_code == 401

    def test_other_no_company(self):
        r = requests.get(f"{API}/me", headers=H("other"))
        assert r.status_code == 200, r.text
        assert r.json()["company"] is None

    def test_other_customers_409(self):
        assert requests.get(f"{API}/customers", headers=H("other")).status_code == 409

    def test_owner_me(self):
        r = requests.get(f"{API}/me", headers=H("owner"))
        d = r.json()
        assert r.status_code == 200 and d["role"] == "owner" and d["company"]["name"]
        assert d["company"]["plan"] == "free"
        S["company_id"] = d["company"]["id"]

    def test_owner_create_company_again_409(self):
        assert requests.post(f"{API}/company", headers=H("owner"), json={"name": "x"}).status_code == 409


# --- customers CRUD ---
class TestCustomers:
    def test_crud(self):
        r = requests.post(f"{API}/customers", headers=H("owner"), json={"name": "TEST_Musteri", "phone": "0555", "address": "Adres 1"})
        assert r.status_code == 200, r.text
        cid = r.json()["id"]; S["cid"] = cid
        g = requests.get(f"{API}/customers/{cid}", headers=H("owner")).json()
        assert g["name"] == "TEST_Musteri" and g["jobs"] == []
        lst = requests.get(f"{API}/customers?q=TEST_Mus", headers=H("owner")).json()
        assert any(c["id"] == cid for c in lst)
        u = requests.put(f"{API}/customers/{cid}", headers=H("owner"), json={"name": "TEST_Musteri2", "phone": "0556", "address": "Adres 2"})
        assert u.status_code == 200 and u.json()["name"] == "TEST_Musteri2"
        # delete a throwaway customer
        t = requests.post(f"{API}/customers", headers=H("owner"), json={"name": "TEST_Del"}).json()
        assert requests.delete(f"{API}/customers/{t['id']}", headers=H("owner")).status_code == 200
        assert requests.get(f"{API}/customers/{t['id']}", headers=H("owner")).status_code == 404

    def test_validation(self):
        assert requests.post(f"{API}/customers", headers=H("owner"), json={"name": ""}).status_code == 422


# --- jobs ---
class TestJobs:
    def test_create_and_flow(self):
        today = datetime.now(timezone(timedelta(hours=3))).strftime("%Y-%m-%dT10:00")
        r = requests.post(f"{API}/jobs", headers=H("owner"), json={"customer_id": S["cid"], "job_type": "TEST_Kombi bakım",
                                                                  "scheduled_at": today, "price": 750})
        assert r.status_code == 200, r.text
        j = r.json(); S["jid"] = j["id"]; S["token"] = j["public_token"]
        assert j["status"] == "bekliyor" and j["address"] == "Adres 2" and j["customer_name"] == "TEST_Musteri2"
        assert any(x["id"] == j["id"] for x in requests.get(f"{API}/jobs?status=aktif", headers=H("owner")).json())
        assert any(x["id"] == j["id"] for x in requests.get(f"{API}/jobs?scope=today", headers=H("owner")).json())
        assert not any(x["id"] == j["id"] for x in requests.get(f"{API}/jobs?status=tamamlandi", headers=H("owner")).json())

    def test_bad_customer_400(self):
        r = requests.post(f"{API}/jobs", headers=H("owner"), json={"customer_id": "nope", "job_type": "TEST_x", "scheduled_at": "2026-01-01T10:00"})
        assert r.status_code == 400

    def test_update(self):
        r = requests.put(f"{API}/jobs/{S['jid']}", headers=H("owner"), json={"customer_id": S["cid"], "job_type": "TEST_Kombi bakım 2",
                                                                             "scheduled_at": requests.get(f"{API}/jobs/{S['jid']}", headers=H("owner")).json()["scheduled_at"], "price": 800})
        assert r.status_code == 200 and r.json()["price"] == 800 and r.json()["job_type"] == "TEST_Kombi bakım 2"

    def test_status_patch(self):
        for st in ["yolda", "yapiliyor"]:
            r = requests.patch(f"{API}/jobs/{S['jid']}/status", headers=H("owner"), json={"status": st})
            assert r.status_code == 200 and r.json()["status"] == st
        assert requests.patch(f"{API}/jobs/{S['jid']}/status", headers=H("owner"), json={"status": "bad"}).status_code == 422

    def test_public_form_not_completed_404(self):
        assert requests.get(f"{API}/public/form/{S['token']}").status_code == 404

    def test_photo_upload_and_get(self):
        r = requests.post(f"{API}/jobs/{S['jid']}/photos", headers=H("owner"), data={"kind": "once"},
                          files={"file": ("a.png", png_bytes(), "image/png")})
        assert r.status_code == 200, r.text
        p = r.json(); S["photo"] = p
        assert p["kind"] == "once"
        f = requests.get(f"{API}/files/{p['path']}", headers=H("owner"))
        assert f.status_code == 200 and f.headers["content-type"].startswith("image/png")
        assert requests.get(f"{API}/files/{p['path']}").status_code == 401
        bad = requests.post(f"{API}/jobs/{S['jid']}/photos", headers=H("owner"), data={"kind": "once"},
                            files={"file": ("a.txt", b"hi", "text/plain")})
        assert bad.status_code == 400
        r2 = requests.post(f"{API}/jobs/{S['jid']}/photos", headers=H("owner"), data={"kind": "sonra"},
                           files={"file": ("b.png", png_bytes(), "image/png")})
        assert r2.status_code == 200 and r2.json()["kind"] == "sonra"

    def test_complete_and_public_form(self):
        before = requests.get(f"{API}/dashboard", headers=H("owner")).json()
        r = requests.post(f"{API}/jobs/{S['jid']}/complete", headers=H("owner"), json={"work_notes": "Filtre değişti", "materials": "Filtre", "paid": False})
        assert r.status_code == 200 and r.json()["status"] == "tamamlandi" and r.json()["completed_at"]
        after = requests.get(f"{API}/dashboard", headers=H("owner")).json()
        assert after["month_revenue"] == before["month_revenue"] + 800
        assert after["pending_amount"] == before["pending_amount"] + 800
        assert after["completed_count"] == before["completed_count"] + 1
        rec = requests.get(f"{API}/receivables", headers=H("owner")).json()
        assert any(x["id"] == S["jid"] for x in rec)
        pf = requests.get(f"{API}/public/form/{S['token']}")
        assert pf.status_code == 200, pf.text
        d = pf.json()
        assert d["job"]["work_notes"] == "Filtre değişti" and len(d["job"]["photos"]) == 2 and d["company"]["name"]
        assert "public_token" not in d["job"] and "company_id" not in d["job"]
        ph = requests.get(f"{API}/public/form/{S['token']}/photo/{S['photo']['id']}")
        assert ph.status_code == 200 and len(ph.content) > 0

    def test_payment_patch(self):
        r = requests.patch(f"{API}/jobs/{S['jid']}/payment", headers=H("owner"), json={"paid": True, "payment_method": "nakit"})
        assert r.status_code == 200 and r.json()["paid"] is True and r.json()["payment_method"] == "nakit"
        rec = requests.get(f"{API}/receivables", headers=H("owner")).json()
        assert not any(x["id"] == S["jid"] for x in rec)
        d = requests.get(f"{API}/dashboard", headers=H("owner")).json()
        assert d["month_collected"] >= 800

    def test_customer_with_jobs_cannot_delete(self):
        assert requests.delete(f"{API}/customers/{S['cid']}", headers=H("owner")).status_code == 409


# --- cross-company isolation ---
class TestIsolation:
    def test_other_company_404(self):
        r = requests.post(f"{API}/company", headers=H("other"), json={"name": "TEST_Other Co"})
        assert r.status_code == 200, r.text
        assert requests.get(f"{API}/customers/{S['cid']}", headers=H("other")).status_code == 404
        assert requests.get(f"{API}/jobs/{S['jid']}", headers=H("other")).status_code == 404
        assert requests.patch(f"{API}/jobs/{S['jid']}/status", headers=H("other"), json={"status": "iptal"}).status_code == 404
        assert requests.get(f"{API}/files/{S['photo']['path']}", headers=H("other")).status_code == 404
        assert requests.delete(f"{API}/jobs/{S['jid']}", headers=H("other")).status_code == 404
        assert not any(c["id"] == S["cid"] for c in requests.get(f"{API}/customers", headers=H("other")).json())


# --- free limit ---
class TestFreeLimit:
    def test_16th_job_402(self):
        count = requests.get(f"{API}/billing", headers=H("owner")).json()["jobs_this_month"]
        created = []
        for _ in range(max(0, 15 - count)):
            r = requests.post(f"{API}/jobs", headers=H("owner"), json={"customer_id": S["cid"], "job_type": "TEST_limit", "scheduled_at": "2026-01-20T09:00"})
            assert r.status_code == 200, r.text
            created.append(r.json()["id"])
        r = requests.post(f"{API}/jobs", headers=H("owner"), json={"customer_id": S["cid"], "job_type": "TEST_limit", "scheduled_at": "2026-01-20T09:00"})
        assert r.status_code == 402, r.text
        for jid in created:
            assert requests.delete(f"{API}/jobs/{jid}", headers=H("owner")).status_code == 200
        assert requests.get(f"{API}/jobs/{created[0]}", headers=H("owner")).status_code == 404 if created else True


# --- team / staff ---
class TestTeam:
    def test_invite_free_402(self):
        r = requests.post(f"{API}/team/invite", headers=H("owner"), json={"name": "Mehmet", "email": TOK["staff"]["email"]})
        assert r.status_code == 402

    def test_pro_invite_and_staff_flow(self):
        until = (datetime.now(timezone.utc) + timedelta(days=10)).isoformat()
        dbop(lambda db: db.companies.update_one({"id": S["company_id"]}, {"$set": {"pro_until": until}}))
        assert requests.get(f"{API}/me", headers=H("owner")).json()["company"]["plan"] == "pro"
        r = requests.post(f"{API}/team/invite", headers=H("owner"), json={"name": "Mehmet Usta", "email": TOK["staff"]["email"].upper()})
        assert r.status_code == 200, r.text
        assert requests.post(f"{API}/team/invite", headers=H("owner"), json={"name": "x", "email": TOK["staff"]["email"]}).status_code == 409
        me = requests.get(f"{API}/me", headers=H("staff")).json()
        assert me["role"] == "staff" and me["company"]["id"] == S["company_id"], me
        staff_id = TOK["staff"]["user_id"]
        team = requests.get(f"{API}/team", headers=H("owner")).json()
        assert any(m["user_id"] == staff_id for m in team["members"]) and team["invites"] == []
        # assign new job to staff
        j = requests.post(f"{API}/jobs", headers=H("owner"), json={"customer_id": S["cid"], "job_type": "TEST_staff job",
                                                                  "scheduled_at": "2026-01-21T09:00", "assigned_to": staff_id, "price": 100}).json()
        assert j["assigned_name"] == "Mehmet Usta"
        jobs = requests.get(f"{API}/jobs", headers=H("staff")).json()
        assert [x["id"] for x in jobs] == [j["id"]]
        assert requests.get(f"{API}/jobs/{S['jid']}", headers=H("staff")).status_code == 404
        assert requests.get(f"{API}/customers", headers=H("staff")).status_code == 403
        assert requests.get(f"{API}/receivables", headers=H("staff")).status_code == 403
        assert requests.post(f"{API}/jobs", headers=H("staff"), json={"customer_id": S["cid"], "job_type": "TEST_x", "scheduled_at": "2026-01-21T09:00"}).status_code == 403
        assert requests.patch(f"{API}/jobs/{j['id']}/status", headers=H("staff"), json={"status": "yolda"}).json()["status"] == "yolda"
        c = requests.post(f"{API}/jobs/{j['id']}/complete", headers=H("staff"), json={"work_notes": "ok", "paid": True, "payment_method": "kart"})
        assert c.status_code == 200 and c.json()["payment_method"] == "kart"
        d = requests.get(f"{API}/dashboard", headers=H("staff")).json()
        assert d["completed_count"] == 1
        # remove staff
        assert requests.delete(f"{API}/team/{staff_id}", headers=H("owner")).status_code == 200


# --- billing ---
class TestBilling:
    def test_checkout_and_status(self):
        r = requests.post(f"{API}/billing/checkout", headers=H("owner"), json={"origin_url": BASE_URL})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["url"].startswith("https://checkout.stripe.com") and d["session_id"]
        s = requests.get(f"{API}/payments/status/{d['session_id']}")
        assert s.status_code == 200 and s.json()["payment_status"] in ("pending", "unpaid"), s.text
        assert requests.get(f"{API}/payments/status/cs_test_nope").status_code == 404

    def test_billing_info(self):
        d = requests.get(f"{API}/billing", headers=H("owner")).json()
        assert d["price"] == 399.0 and d["free_job_limit"] == 15
