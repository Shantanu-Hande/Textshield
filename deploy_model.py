"""
TextShield - Model Deployer
===========================
Run this after downloading the zip from Google Colab.
It will find the zip, extract it, and copy all model files
into the correct place in your project automatically.

Run: python deploy_model.py
"""

import os
import sys
import shutil
import zipfile
import glob
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────
# Folder where your Colab zip gets downloaded (change if different)
DOWNLOADS_DIR = Path.home() / "Downloads"

# Your project root — the folder where 05_api_server.py lives
# If you run this script from inside your project folder, leave as "."
PROJECT_DIR = Path(__file__).parent.resolve()

# Where models should land inside your project
MODEL_DIR = PROJECT_DIR / "models"
FL_DIR    = PROJECT_DIR / "models" / "federated"

print("=" * 60)
print("  TextShield - Model Deployer")
print("=" * 60)
print(f"\n  Project : {PROJECT_DIR}")
print(f"  Looking : {DOWNLOADS_DIR}")

# ── Step 1: Find the zip ──────────────────────────────────────────────────────
print("\n[1/4] Searching for model zip in Downloads...")

# Look for any zip that contains "model" or "textshield" in the name
candidates = sorted(
    glob.glob(str(DOWNLOADS_DIR / "*.zip")),
    key=os.path.getmtime,
    reverse=True,   # most recent first
)

if not candidates:
    print("\n  ERROR: No zip files found in Downloads folder.")
    print(f"  Make sure your Colab zip was downloaded to:\n  {DOWNLOADS_DIR}")
    sys.exit(1)

# Pick the most recently downloaded zip
zip_path = Path(candidates[0])
print(f"  Found   : {zip_path.name}")

# If multiple zips exist, let user confirm
if len(candidates) > 1:
    print(f"\n  Multiple zips found. Using most recent: {zip_path.name}")
    print("  (Edit DOWNLOADS_DIR in this script if that's wrong)")

# ── Step 2: Extract zip ───────────────────────────────────────────────────────
print("\n[2/4] Extracting zip...")

extract_dir = DOWNLOADS_DIR / "_textshield_extracted"
if extract_dir.exists():
    shutil.rmtree(extract_dir)   # clean previous extraction
extract_dir.mkdir()

with zipfile.ZipFile(zip_path, "r") as z:
    z.extractall(extract_dir)
    names = z.namelist()
    print(f"  Extracted {len(names)} files")

# ── Step 3: Find model files inside extracted folder ─────────────────────────
print("\n[3/4] Locating model files...")

# Walk extracted dir to find key files
found = {}
for root, dirs, files in os.walk(extract_dir):
    root_path = Path(root)
    for f in files:
        full = root_path / f
        rel  = str(full.relative_to(extract_dir))
        found[f] = full   # index by filename

# Key files we expect
EXPECTED = [
    "best_model.pt",
    "config.json",
    "metrics.json",
    "history.json",
]
FL_EXPECTED = [
    "fl_global_model.pt",
    "fl_metrics.json",
    "fl_history.json",
]

missing = [f for f in EXPECTED if f not in found]
if missing:
    print(f"\n  WARNING: These expected files were not found in the zip:")
    for m in missing:
        print(f"    - {m}")
    print("  Continuing anyway with whatever was found...\n")
else:
    print(f"  All expected model files found.")

# ── Step 4: Copy into project ─────────────────────────────────────────────────
print("\n[4/4] Copying files into project...")

os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(FL_DIR,    exist_ok=True)

copied = 0
skipped = 0

for filename, src_path in found.items():
    # Decide destination based on filename
    if filename in FL_EXPECTED:
        dest = FL_DIR / filename
    elif filename in EXPECTED or filename.endswith(".pt") or filename.endswith(".json"):
        dest = MODEL_DIR / filename
    elif filename in ("vocab.txt", "tokenizer_config.json", "special_tokens_map.json",
                      "tokenizer.json", "config.json"):
        # tokenizer files go into models/tokenizer/
        tok_dir = MODEL_DIR / "tokenizer"
        os.makedirs(tok_dir, exist_ok=True)
        dest = tok_dir / filename
    else:
        skipped += 1
        continue

    shutil.copy2(src_path, dest)
    print(f"  Copied  : {filename} → {dest.relative_to(PROJECT_DIR)}")
    copied += 1

# Also handle tokenizer subfolder if it exists as a directory in the zip
for root, dirs, files in os.walk(extract_dir):
    if "tokenizer" in Path(root).parts:
        for f in files:
            src  = Path(root) / f
            tok_dir = MODEL_DIR / "tokenizer"
            os.makedirs(tok_dir, exist_ok=True)
            dest = tok_dir / f
            shutil.copy2(src, dest)
            print(f"  Copied  : tokenizer/{f} → {dest.relative_to(PROJECT_DIR)}")
            copied += 1

print(f"\n  Total copied : {copied} files")
if skipped:
    print(f"  Skipped      : {skipped} unrecognised files")

# ── Cleanup ───────────────────────────────────────────────────────────────────
shutil.rmtree(extract_dir)
print(f"\n  Cleaned up temporary extraction folder.")

# ── Done ──────────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("  [DONE] Model deployed successfully!")
print(f"\n  You can now run:")
print(f"    python 05_api_server.py")
print("=" * 60 + "\n")
