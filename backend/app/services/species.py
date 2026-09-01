import re
import yaml
from pathlib import Path
from sqlalchemy.orm import Session

# Slugs become filenames on disk (see save_yaml) — restrict to a safe filename
# component so a slug like "../../../etc/whatever" can't escape the species-data
# directory and write or overwrite an arbitrary .yaml file on the container.
_SAFE_SLUG = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")


def is_safe_slug(slug) -> bool:
    return isinstance(slug, str) and bool(_SAFE_SLUG.match(slug))


class SpeciesService:
    """Loads all YAML species files at startup and provides slug-based lookups."""

    def __init__(self):
        self._index: dict[str, dict] = {}
        self._data_path = Path("/app/species-data")

    def load(self):
        self._index.clear()
        for yaml_file in self._data_path.rglob("*.yaml"):
            with open(yaml_file) as f:
                data = yaml.safe_load(f)
            slug = data.get("slug")
            if slug:
                self._index[slug] = data
        print(f"[species] Loaded {len(self._index)} species from {self._data_path}")

    def get(self, slug: str) -> dict | None:
        return self._index.get(slug)

    def all(self) -> list[dict]:
        return list(self._index.values())

    def by_type(self, type_: str) -> list[dict]:
        return [s for s in self._index.values() if s.get("type") == type_]

    def validate_slug(self, slug: str) -> bool:
        return slug in self._index

    def save_yaml(self, slug: str, type_: str, contents: bytes) -> None:
        if not is_safe_slug(slug):
            raise ValueError(f"Invalid slug: {slug!r} (use lowercase letters, digits, and hyphens only)")
        subfolder = {"fish": "fish", "plant": "plants", "invertebrate": "invertebrates", "amphibian": "amphibians"}.get(type_, type_)
        path = self._data_path / subfolder / f"{slug}.yaml"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(contents)

    def get_yaml_path(self, slug: str) -> Path | None:
        current = self._index.get(slug)
        if not current:
            return None
        type_ = current.get("type", "")
        subfolder = {"fish": "fish", "plant": "plants", "invertebrate": "invertebrates", "amphibian": "amphibians"}.get(type_, type_)
        path = self._data_path / subfolder / f"{slug}.yaml"
        return path if path.exists() else None

    def delete_yaml_for_slug(self, slug: str) -> bool:
        """Delete the YAML file for the given slug, using the current index to find its type."""
        current = self._index.get(slug)
        if not current:
            return False
        type_ = current.get("type", "")
        subfolder = {"fish": "fish", "plant": "plants", "invertebrate": "invertebrates", "amphibian": "amphibians"}.get(type_, type_)
        path = self._data_path / subfolder / f"{slug}.yaml"
        if path.exists():
            path.unlink()
            return True
        return False

    def count(self) -> int:
        return len(self._index)


species_service = SpeciesService()


def check_compatibility(db: Session, tank_id: str, slug: str) -> dict:
    """Check if a species slug is compatible with existing fish in a tank."""
    from app.models.models import TankFish

    incoming = species_service.get(slug)
    if not incoming:
        return {"warnings": [], "errors": [f"Unknown species: {slug}"]}

    existing_fish = db.query(TankFish).filter_by(tank_id=tank_id).all()
    warnings = []
    for row in existing_fish:
        existing = species_service.get(row.species_slug)
        if not existing:
            continue
        compat = incoming.get("compatibility", {})
        incompat_list = compat.get("incompatible_with", [])
        if existing["slug"] in incompat_list:
            warnings.append(f"{incoming['common_name']} is incompatible with {existing['common_name']} already in this tank.")
        existing_incompat = existing.get("compatibility", {}).get("incompatible_with", [])
        if incoming["slug"] in existing_incompat:
            warnings.append(f"{existing['common_name']} (already in tank) is incompatible with {incoming['common_name']}.")

    return {"warnings": list(set(warnings)), "errors": []}
