import os
import yaml
from pathlib import Path


class SpeciesService:
    """Loads all YAML species files at startup and provides slug-based lookups."""

    def __init__(self):
        self._index: dict[str, dict] = {}
        self._data_path = Path(os.environ.get("SPECIES_DATA_PATH", "species-data"))

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
