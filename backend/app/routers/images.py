import json
import os
import urllib.parse
import urllib.request
import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import FileResponse

router = APIRouter()

IMAGES_PATH = Path(os.environ.get("IMAGES_PATH", "images"))

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
EXT_MAP = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/gif": ".gif"}
MEDIA_MAP = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif"}


def _find(slug: str) -> Path | None:
    for ext in EXT_MAP.values():
        p = IMAGES_PATH / "species" / f"{slug}{ext}"
        if p.exists():
            return p
    return None


@router.post("/species/{slug}")
async def upload_species_image(slug: str, file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported type: {file.content_type}. Use JPEG, PNG, WebP, or GIF.")
    ext = EXT_MAP[file.content_type]
    dest_dir = IMAGES_PATH / "species"
    dest_dir.mkdir(parents=True, exist_ok=True)
    # Remove any existing image for this slug before saving
    for old_ext in EXT_MAP.values():
        old = dest_dir / f"{slug}{old_ext}"
        if old.exists():
            old.unlink()
    contents = await file.read()
    (dest_dir / f"{slug}{ext}").write_bytes(contents)
    return {"ok": True, "url": f"/api/images/species/{slug}"}


@router.get("/species/{slug}")
def get_species_image(slug: str):
    path = _find(slug)
    if not path:
        raise HTTPException(404, "No image for this species")
    return FileResponse(str(path), media_type=MEDIA_MAP.get(path.suffix, "image/jpeg"))


@router.post("/species/{slug}/fetch")
def fetch_species_image(slug: str, latin_name: str = Query(...)):
    """Download a species image from iNaturalist by Latin name and store it locally."""
    if not latin_name.strip():
        raise HTTPException(400, "latin_name is required")

    q = urllib.parse.quote(latin_name.strip())
    taxa_url = f"https://api.inaturalist.org/v1/taxa?q={q}&rank=species&per_page=1"
    try:
        req = urllib.request.Request(taxa_url, headers={"User-Agent": "TankBook/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
    except Exception as e:
        raise HTTPException(502, f"Failed to query iNaturalist: {e}")

    results = data.get("results", [])
    if not results:
        raise HTTPException(404, f"No taxa found for: {latin_name}")

    photo = results[0].get("default_photo")
    if not photo:
        raise HTTPException(404, f"No photo available for: {latin_name}")

    image_url = photo.get("medium_url") or photo.get("url")
    if not image_url:
        raise HTTPException(404, "No image URL in iNaturalist response")

    # Guess extension from URL path (before any query string)
    url_path = image_url.split("?")[0].lower()
    ext = ".jpg"
    for suffix in (".png", ".webp", ".gif", ".jpeg", ".jpg"):
        if url_path.endswith(suffix):
            ext = ".jpg" if suffix == ".jpeg" else suffix
            break

    try:
        req2 = urllib.request.Request(image_url, headers={"User-Agent": "TankBook/1.0"})
        with urllib.request.urlopen(req2, timeout=15) as resp2:
            image_data = resp2.read()
    except Exception as e:
        raise HTTPException(502, f"Failed to download image: {e}")

    dest_dir = IMAGES_PATH / "species"
    dest_dir.mkdir(parents=True, exist_ok=True)
    for old_ext in EXT_MAP.values():
        old = dest_dir / f"{slug}{old_ext}"
        if old.exists():
            old.unlink()
    (dest_dir / f"{slug}{ext}").write_bytes(image_data)

    return {"ok": True, "url": f"/api/images/species/{slug}", "source": "iNaturalist"}


@router.delete("/species/{slug}")
def delete_species_image(slug: str):
    path = _find(slug)
    if not path:
        raise HTTPException(404, "No image for this species")
    path.unlink()
    return {"ok": True}


# ── Tank gallery ──────────────────────────────────────────────────────────────

def _tank_dir(tank_id: str) -> Path:
    return IMAGES_PATH / "tanks" / tank_id

def _safe_filename(filename: str) -> str:
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(400, "Invalid filename")
    return filename


@router.post("/tanks/{tank_id}")
async def upload_tank_image(tank_id: str, file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported type: {file.content_type}. Use JPEG, PNG, WebP, or GIF.")
    ext = EXT_MAP[file.content_type]
    dest_dir = _tank_dir(tank_id)
    dest_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{ext}"
    contents = await file.read()
    (dest_dir / filename).write_bytes(contents)
    return {"ok": True, "filename": filename, "url": f"/api/images/tanks/{tank_id}/{filename}"}


@router.get("/tanks/{tank_id}")
def list_tank_images(tank_id: str):
    tank_dir = _tank_dir(tank_id)
    if not tank_dir.exists():
        return []
    images = sorted(
        (p for ext in EXT_MAP.values() for p in tank_dir.glob(f"*{ext}")),
        key=lambda p: p.stat().st_mtime,
    )
    return [{"filename": p.name, "url": f"/api/images/tanks/{tank_id}/{p.name}"} for p in images]


@router.get("/tanks/{tank_id}/{filename}")
def get_tank_image(tank_id: str, filename: str):
    filename = _safe_filename(filename)
    path = _tank_dir(tank_id) / filename
    if not path.exists():
        raise HTTPException(404, "Image not found")
    return FileResponse(str(path), media_type=MEDIA_MAP.get(path.suffix, "image/jpeg"))


@router.delete("/tanks/{tank_id}/{filename}")
def delete_tank_image(tank_id: str, filename: str):
    filename = _safe_filename(filename)
    path = _tank_dir(tank_id) / filename
    if not path.exists():
        raise HTTPException(404, "Image not found")
    path.unlink()
    return {"ok": True}
