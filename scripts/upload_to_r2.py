#!/usr/bin/env python3
"""
Upload all videos + thumbnails to Cloudflare R2.

Usage:  python3 scripts/upload_to_r2.py

Requires:  pip install boto3
Reads credentials from backend/.env (BBF_R2_*).
"""
import os
import sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import boto3
from botocore.config import Config
import mimetypes

# ─── Config from .env ──────────────────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = ROOT / "backend" / ".env"

def load_env():
    cfg = {}
    for line in ENV_FILE.read_text().splitlines():
        line = line.strip()
        if line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        cfg[k.strip()] = v.strip()
    return cfg

env = load_env()
ENDPOINT = env["BBF_R2_ENDPOINT"]
ACCESS_KEY = env["BBF_R2_ACCESS_KEY_ID"]
SECRET_KEY = env["BBF_R2_SECRET_ACCESS_KEY"]
BUCKET = env["BBF_R2_BUCKET"]

# ─── Upload setup ──────────────────────────────────────────────────
VIDEOS_DIR = ROOT / "videos"
EXTS = {".mp4", ".jpg", ".jpeg", ".png", ".webp", ".gif"}
CONCURRENCY = 8  # parallel uploads

s3 = boto3.client(
    "s3",
    endpoint_url=ENDPOINT,
    aws_access_key_id=ACCESS_KEY,
    aws_secret_access_key=SECRET_KEY,
    config=Config(signature_version="s3v4", region_name="auto", max_pool_connections=CONCURRENCY * 2),
)

# ─── Build file list ───────────────────────────────────────────────
all_files = []
for path in VIDEOS_DIR.rglob("*"):
    if path.is_file() and path.suffix.lower() in EXTS:
        rel = path.relative_to(VIDEOS_DIR)
        key = str(rel).replace(os.sep, "/")  # e.g. "chest/bench-press.mp4"
        all_files.append((path, key))

print(f"Found {len(all_files)} files to upload")
total_size = sum(p.stat().st_size for p, _ in all_files)
print(f"Total size: {total_size / (1024**3):.2f} GB\n")

# ─── Skip already-uploaded ─────────────────────────────────────────
print("Checking existing files in bucket...")
existing = set()
paginator = s3.get_paginator("list_objects_v2")
try:
    for page in paginator.paginate(Bucket=BUCKET):
        for obj in page.get("Contents", []):
            existing.add(obj["Key"])
    print(f"  {len(existing)} files already in bucket, will skip those\n")
except Exception as e:
    print(f"  (could not list: {e}, will upload all)\n")

to_upload = [(p, k) for (p, k) in all_files if k not in existing]
print(f"{len(to_upload)} files to upload this run\n")

if not to_upload:
    print("Nothing to do.")
    sys.exit(0)

# ─── Upload in parallel ────────────────────────────────────────────
def upload_one(item):
    path, key = item
    ctype, _ = mimetypes.guess_type(str(path))
    if not ctype:
        ctype = "application/octet-stream"
    try:
        s3.upload_file(
            str(path),
            BUCKET,
            key,
            ExtraArgs={"ContentType": ctype, "CacheControl": "public, max-age=31536000"},
        )
        return (key, True, None)
    except Exception as e:
        return (key, False, str(e))

ok = 0
failed = 0
last_progress = 0

with ThreadPoolExecutor(max_workers=CONCURRENCY) as executor:
    futures = {executor.submit(upload_one, item): item for item in to_upload}
    for i, future in enumerate(as_completed(futures), 1):
        key, success, err = future.result()
        if success:
            ok += 1
        else:
            failed += 1
            print(f"  FAIL  {key}: {err}")
        # Progress every 10 files or last
        if i - last_progress >= 10 or i == len(to_upload):
            last_progress = i
            print(f"  [{i}/{len(to_upload)}] ✓ {ok}  ✗ {failed}")

print(f"\n✅ Done: {ok} uploaded, {failed} failed")

# Print sample URL
public_url = env.get("BBF_R2_PUBLIC_URL", "")
if public_url and to_upload:
    print(f"\nTest URL: {public_url}/{to_upload[0][1]}")
