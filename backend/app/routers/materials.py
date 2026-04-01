from datetime import datetime
from typing import Optional, List
import json as _json
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.database import get_db, next_id, doc_to_dict

router = APIRouter()


class ComponentRatio(BaseModel):
    component_id: int
    ratio: float  # percentage 0–100
    is_variable: bool = False
    alternates: List[int] = []


class SubMaterialRatio(BaseModel):
    material_id: int
    ratio: float  # percentage 0–100


class MaterialIn(BaseModel):
    name: str
    description: Optional[str] = None
    density: Optional[float] = None  # g/mL
    components: List[ComponentRatio] = []
    sub_materials: List[SubMaterialRatio] = []
    schema_values: Optional[dict] = None
    variant_of: Optional[int] = None
    archived: bool = False


ALLOWED_TRANSITIONS = {
    "draft":      ["testing"],
    "testing":    ["approved", "draft"],
    "approved":   ["deprecated"],
    "deprecated": ["draft"],
}


class StatusTransitionIn(BaseModel):
    to_status: str


def _has_cycle(db, material_id: int, proposed_sub_ids: list) -> bool:
    """Return True if any proposed sub-material transitively references material_id."""
    visited = set()
    queue = list(proposed_sub_ids)
    while queue:
        current = queue.pop()
        if current == material_id:
            return True
        if current in visited:
            continue
        visited.add(current)
        mat = db.materials.find_one({"_id": current}, {"sub_materials": 1})
        if mat:
            for s in mat.get("sub_materials", []):
                queue.append(s["material_id"])
    return False


def _validate(db, payload: MaterialIn, material_id: int = None):
    has_entries = payload.components or payload.sub_materials
    if has_entries:
        total = sum(c.ratio for c in payload.components) + sum(s.ratio for s in payload.sub_materials)
        if abs(total - 100.0) > 0.01:
            raise HTTPException(
                status_code=422,
                detail=f"Component ratios must sum to 100% (currently {total:.2f}%)",
            )
        for c in payload.components:
            if not db.material_components.find_one({"_id": c.component_id}):
                raise HTTPException(status_code=404, detail=f"Component {c.component_id} not found")
        for s in payload.sub_materials:
            if not db.materials.find_one({"_id": s.material_id}):
                raise HTTPException(status_code=404, detail=f"Sub-material {s.material_id} not found")
    if material_id is not None and payload.sub_materials:
        sub_ids = [s.material_id for s in payload.sub_materials]
        if material_id in sub_ids:
            raise HTTPException(status_code=422, detail="A material cannot be a sub-material of itself")
        if _has_cycle(db, material_id, sub_ids):
            raise HTTPException(status_code=422, detail="Adding this sub-material would create a circular dependency")


@router.get("/")
def list_materials():
    db = get_db()
    return [doc_to_dict(d) for d in db.materials.find({"deleted": {"$ne": True}}).sort("name", 1)]


@router.get("/deleted")
def list_deleted_materials():
    db = get_db()
    return [doc_to_dict(d) for d in db.materials.find({"deleted": True}).sort("deleted_at", -1)]


@router.post("/")
def create_material(payload: MaterialIn):
    db = get_db()
    if db.materials.find_one({"name": payload.name}):
        raise HTTPException(status_code=409, detail=f"Material '{payload.name}' already exists")
    _validate(db, payload)
    doc = {
        "_id":           next_id("materials"),
        "name":          payload.name,
        "description":   payload.description,
        "density":       payload.density,
        "components":    [c.model_dump() for c in payload.components],
        "sub_materials": [s.model_dump() for s in payload.sub_materials],
        "schema_values": payload.schema_values or {},
        "variant_of":    payload.variant_of,
        "archived":      payload.archived,
        "status":        "draft",
        "version":       1,
        "created_at":    datetime.utcnow(),
    }
    db.materials.insert_one(doc)
    return doc_to_dict(doc)


@router.post("/{material_id}/duplicate")
def duplicate_material(material_id: int):
    db = get_db()
    original = db.materials.find_one({"_id": material_id})
    if not original:
        raise HTTPException(status_code=404, detail="Material not found")
    base_name = original["name"]
    candidate = f"Copy of {base_name}"
    counter = 2
    while db.materials.find_one({"name": candidate}):
        candidate = f"Copy of {base_name} ({counter})"
        counter += 1
    doc = {k: v for k, v in original.items() if k not in ("_id", "created_at")}
    doc["_id"] = next_id("materials")
    doc["name"] = candidate
    doc["archived"] = False
    doc["status"] = "draft"
    doc["version"] = 1
    doc["created_at"] = datetime.utcnow()
    db.materials.insert_one(doc)
    return doc_to_dict(doc)


@router.put("/{material_id}")
def update_material(material_id: int, payload: MaterialIn, request: Request):
    db = get_db()
    existing = db.materials.find_one({"_id": material_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Material not found")
    clash = db.materials.find_one({"name": payload.name, "_id": {"$ne": material_id}})
    if clash:
        raise HTTPException(status_code=409, detail=f"Material '{payload.name}' already exists")
    _validate(db, payload, material_id=material_id)
    db.materials.update_one(
        {"_id": material_id},
        {
            "$set": {
                "name":          payload.name,
                "description":   payload.description,
                "density":       payload.density,
                "components":    [c.model_dump() for c in payload.components],
                "sub_materials": [s.model_dump() for s in payload.sub_materials],
                "schema_values": payload.schema_values or {},
                "variant_of":    payload.variant_of,
                "archived":      payload.archived,
            },
            "$inc": {"version": 1},
        },
    )
    updated = db.materials.find_one({"_id": material_id})
    saved_by = None
    try:
        header = request.headers.get("X-Auth-User")
        if header:
            saved_by = _json.loads(header).get("name")
    except Exception:
        pass
    db.material_versions.insert_one({
        "_id":         next_id("material_versions"),
        "material_id": material_id,
        "version":     updated.get("version", 1),
        "saved_at":    datetime.utcnow(),
        "saved_by":    saved_by,
        "data":        doc_to_dict(updated),
    })
    return doc_to_dict(updated)


@router.get("/{material_id}/versions")
def list_versions(material_id: int):
    db = get_db()
    if not db.materials.find_one({"_id": material_id}):
        raise HTTPException(status_code=404, detail="Material not found")
    versions = list(db.material_versions.find({"material_id": material_id}).sort("saved_at", -1))
    return [doc_to_dict(v) for v in versions]


@router.post("/{material_id}/transition")
def transition_status(material_id: int, payload: StatusTransitionIn):
    db = get_db()
    existing = db.materials.find_one({"_id": material_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Material not found")
    current = existing.get("status", "draft")
    allowed = ALLOWED_TRANSITIONS.get(current, [])
    if payload.to_status not in allowed:
        raise HTTPException(
            status_code=422,
            detail=f"Cannot transition from '{current}' to '{payload.to_status}'",
        )
    db.materials.update_one({"_id": material_id}, {"$set": {"status": payload.to_status}})
    return doc_to_dict(db.materials.find_one({"_id": material_id}))


@router.get("/{material_id}/versions/by-version/{version_num}")
def get_version_by_number(material_id: int, version_num: int):
    db = get_db()
    v = db.material_versions.find_one({"material_id": material_id, "version": version_num})
    if not v:
        raise HTTPException(status_code=404, detail=f"Version {version_num} not found for material {material_id}")
    return doc_to_dict(v)


@router.delete("/{material_id}")
def delete_material(material_id: int):
    db = get_db()
    existing = db.materials.find_one({"_id": material_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Material not found")
    db.materials.update_one(
        {"_id": material_id},
        {"$set": {"deleted": True, "deleted_at": datetime.utcnow()}},
    )
    return {"ok": True}


class RescueMaterialIn(BaseModel):
    name: Optional[str] = None


@router.post("/{material_id}/rescue")
def rescue_material(material_id: int, payload: RescueMaterialIn = RescueMaterialIn()):
    db = get_db()
    existing = db.materials.find_one({"_id": material_id, "deleted": True})
    if not existing:
        raise HTTPException(status_code=404, detail="Deleted material not found")
    name = payload.name.strip() if payload.name else existing["name"]
    if db.materials.find_one({"name": name, "_id": {"$ne": material_id}, "deleted": {"$ne": True}}):
        raise HTTPException(status_code=409, detail=f"Material '{name}' already exists")
    db.materials.update_one(
        {"_id": material_id},
        {"$set": {"deleted": False, "name": name}, "$unset": {"deleted_at": ""}},
    )
    return doc_to_dict(db.materials.find_one({"_id": material_id}))


@router.delete("/{material_id}/purge")
def purge_material(material_id: int):
    db = get_db()
    if not db.materials.find_one({"_id": material_id}):
        raise HTTPException(status_code=404, detail="Material not found")
    db.material_versions.delete_many({"material_id": material_id})
    db.materials.delete_one({"_id": material_id})
    return {"ok": True}
