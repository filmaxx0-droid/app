import os, json, urllib.request, urllib.error, sys
import requests
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")
SK = os.environ["CLERK_SECRET_KEY"]
H = {"Authorization": "Bearer " + SK, "Content-Type": "application/json", "User-Agent": "emergent-test"}


def bapi(method, path, body=None):
    r = requests.request(method, "https://api.clerk.com/v1" + path, headers=H, json=body, timeout=20)
    return r


def ensure_user(email, first):
    r = bapi("GET", f"/users?email_address={email}")
    if r.ok and r.json():
        return r.json()[0]
    r = bapi("POST", "/users", {"email_address": [email], "password": "Test-pass-12345!", "skip_password_checks": True, "first_name": first})
    r.raise_for_status()
    return r.json()


def token(uid):
    s = bapi("POST", "/sessions", {"user_id": uid}).json()
    return bapi("POST", f"/sessions/{s['id']}/tokens", {"expires_in_seconds": 3600}).json()["jwt"]


if __name__ == "__main__":
    out = {}
    for key, email, first in [("owner", "owner+clerk_test@sahacep.com", "Ahmet"), ("staff", "usta+clerk_test@sahacep.com", "Mehmet"), ("other", "baska+clerk_test@sahacep.com", "Ayse")]:
        u = ensure_user(email, first)
        out[key] = {"user_id": u["id"], "email": email, "token": token(u["id"])}
        if len(sys.argv) > 1 and sys.argv[1] == "ticket":
            out[key]["ticket"] = bapi("POST", "/sign_in_tokens", {"user_id": u["id"], "expires_in_seconds": 3600}).json()["token"]
    json.dump(out, open("/tmp/clerk_tokens.json", "w"))
    print("ok", {k: v["user_id"] for k, v in out.items()})
