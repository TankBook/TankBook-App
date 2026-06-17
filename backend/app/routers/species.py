import urllib.request
import urllib.error
from fastapi import APIRouter, Query, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from app.services.species import species_service
import yaml

REQUIRED_FIELDS = ("slug", "type", "common_name", "latin_name")
VALID_TYPES = {"fish", "plant", "invertebrate", "amphibian"}

router = APIRouter()


def _parse_and_save(contents: bytes) -> dict:
    try:
        data = yaml.safe_load(contents)
    except yaml.YAMLError as e:
        raise HTTPException(status_code=400, detail=f"Invalid YAML: {e}")

    if not isinstance(data, dict):
        raise HTTPException(status_code=400, detail="YAML root must be a mapping")

    missing = [f for f in REQUIRED_FIELDS if not data.get(f)]
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing required fields: {', '.join(missing)}")

    species_type = data["type"]
    if species_type not in VALID_TYPES:
        raise HTTPException(status_code=400, detail=f"type must be one of: {', '.join(sorted(VALID_TYPES))}")

    species_service.save_yaml(data["slug"], species_type, contents)
    species_service.load()
    return {"ok": True, "slug": data["slug"], "common_name": data["common_name"], "type": species_type}


# ── Pydantic schemas for JSON-based create/update ────────────────────────────

class RangeIn(BaseModel):
    min: float | None = None
    max: float | None = None


class CareIn(BaseModel):
    difficulty: str | None = None
    min_tank_litres: int | None = None
    shoal_min: int | None = None
    group_min: int | None = None
    max_size_cm: float | None = None
    lifespan_years: float | None = None
    growth_rate: str | None = None


class WaterIn(BaseModel):
    temp_c: RangeIn | None = None
    ph: RangeIn | None = None
    gh_dgh: RangeIn | None = None
    kh_dkh: RangeIn | None = None


class CompatibilityIn(BaseModel):
    temperament: str | None = None


class LightIn(BaseModel):
    requirement: str | None = None


class SpeciesBody(BaseModel):
    slug: str
    common_name: str
    latin_name: str
    type: str
    family: str | None = None
    origin: str | None = None
    care: CareIn | None = None
    water: WaterIn | None = None
    compatibility: CompatibilityIn | None = None
    light: LightIn | None = None
    co2_required: bool | None = None
    notes: str | None = None


def _build_species_dict(body: SpeciesBody) -> dict:
    data: dict = {
        "slug": body.slug,
        "common_name": body.common_name,
        "latin_name": body.latin_name,
        "type": body.type,
    }
    if body.family:
        data["family"] = body.family
    if body.origin:
        data["origin"] = body.origin

    if body.care:
        care = body.care.model_dump(exclude_none=True)
        if care:
            data["care"] = care

    if body.water:
        water: dict = {}
        for k, v in body.water.model_dump(exclude_none=True).items():
            if v and any(vv is not None for vv in v.values()):
                water[k] = {kk: vv for kk, vv in v.items() if vv is not None}
        if water:
            data["water"] = water

    if body.compatibility:
        compat = body.compatibility.model_dump(exclude_none=True)
        if compat:
            data["compatibility"] = compat

    if body.light:
        light = body.light.model_dump(exclude_none=True)
        if light:
            data["light"] = light

    if body.co2_required is not None:
        data["co2_required"] = body.co2_required

    if body.notes:
        data["notes"] = body.notes

    return data


# ── Routes ───────────────────────────────────────────────────────────────────

@router.get("/")
def list_species(type: str | None = Query(None), search: str | None = Query(None)):
    results = species_service.all()
    if type:
        results = [s for s in results if s.get("type") == type]
    if search:
        q = search.lower()
        results = [s for s in results if q in s.get("common_name", "").lower() or q in s.get("slug", "").lower() or q in s.get("latin_name", "").lower()]
    return results


@router.post("/upload")
async def upload_species(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith((".yaml", ".yml")):
        raise HTTPException(status_code=400, detail="File must be a .yaml or .yml file")
    contents = await file.read()
    return _parse_and_save(contents)


class UrlImportBody(BaseModel):
    url: str


@router.post("/upload-url")
async def upload_species_from_url(body: UrlImportBody):
    url = body.url.strip()
    if not url.startswith(("http://", "https://")):
        raise HTTPException(status_code=400, detail="URL must start with http:// or https://")

    if "github.com" in url and "/blob/" in url:
        url = url.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/")

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "TankBook/0.5.0"})
        with urllib.request.urlopen(req, timeout=10) as response:
            contents = response.read()
    except urllib.error.HTTPError as e:
        raise HTTPException(status_code=400, detail=f"HTTP {e.code} fetching URL: {e.reason}")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {e}")

    return _parse_and_save(contents)


@router.get("/{slug}/yaml")
def download_species_yaml(slug: str):
    path = species_service.get_yaml_path(slug)
    if not path:
        raise HTTPException(404, f"Species not found: {slug}")
    return FileResponse(path=str(path), media_type="application/x-yaml", filename=f"{slug}.yaml")


@router.post("/create")
def create_species(body: SpeciesBody):
    if body.type not in VALID_TYPES:
        raise HTTPException(400, f"type must be one of: {', '.join(sorted(VALID_TYPES))}")
    if not body.slug.strip() or not body.common_name.strip() or not body.latin_name.strip():
        raise HTTPException(400, "slug, common_name, and latin_name are required")
    data = _build_species_dict(body)
    contents = yaml.dump(data, allow_unicode=True, sort_keys=False, default_flow_style=False).encode()
    species_service.save_yaml(body.slug, body.type, contents)
    species_service.load()
    return {"ok": True, "slug": body.slug, "common_name": body.common_name, "type": body.type}


@router.put("/{slug}")
def update_species(slug: str, body: SpeciesBody):
    if not species_service.validate_slug(slug):
        raise HTTPException(404, f"Species not found: {slug}")
    if body.type not in VALID_TYPES:
        raise HTTPException(400, f"type must be one of: {', '.join(sorted(VALID_TYPES))}")
    species_service.delete_yaml_for_slug(slug)
    data = _build_species_dict(body)
    contents = yaml.dump(data, allow_unicode=True, sort_keys=False, default_flow_style=False).encode()
    species_service.save_yaml(body.slug, body.type, contents)
    species_service.load()
    return {"ok": True, "slug": body.slug, "common_name": body.common_name, "type": body.type}
