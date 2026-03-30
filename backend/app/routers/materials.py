from datetime import datetime
from typing import Optional, List
import json as _json
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.database import get_db, next_id, doc_to_dict

router = APIRouter()


class ComponentRatio(BaseModel):
    component_id: int
    ratio: float  # percentage 0–100, must sum to 100
    is_variable: bool = False
    alternates: List[int] = []


class MaterialIn(BaseModel):
    name: str
    description: Optional[str] = None
    density: Optional[float] = None  # g/mL
    components: List[ComponentRatio] = []
    schema_values: Optional[dict] = None
    variant_of: Optional[int] = None


def _validate(db, payload: MaterialIn):
    if payload.components:
        total = sum(c.ratio for c in payload.components)
        if abs(total - 100.0) > 0.01:
            raise HTTPException(
                status_code=422,
                detail=f"Component ratios must sum to 100% (currently {total:.2f}%)",
            )
        for c in payload.components:
            if not db.material_components.find_one({"_id": c.component_id}):
                raise HTTPException(status_code=404, detail=f"Component {c.component_id} not found")


@router.get("/")
def list_materials():
    db = get_db()
    return [doc_to_dict(d) for d in db.materials.find().sort("name", 1)]


@router.post("/")
def create_material(payload: MaterialIn):
    db = get_db()
    if db.materials.find_one({"name": payload.name}):
        raise HTTPException(status_code=409, detail=f"Material '{payload.name}' already exists")
    _validate(db, payload)
    doc = {
        "_id":          next_id("materials"),
        "name":         payload.name,
        "description":  payload.description,
        "density":      payload.density,
        "components":   [c.model_dump() for c in payload.components],
        "schema_values": payload.schema_values or {},
        "variant_of":   payload.variant_of,
        "created_at":   datetime.utcnow(),
    }
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
    _validate(db, payload)
    db.materials.update_one(
        {"_id": material_id},
        {"$set": {
            "name":          payload.name,
            "description":   payload.description,
            "density":       payload.density,
            "components":    [c.model_dump() for c in payload.components],
            "schema_values": payload.schema_values or {},
            "variant_of":    payload.variant_of,
        }},
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
    versions = list(db.material_versions.find({"material_id": material_id}).sort("saved_at", -1).limit(20))
    return [doc_to_dict(v) for v in versions]


@router.delete("/{material_id}")
def delete_material(material_id: int):
    db = get_db()
    result = db.materials.delete_one({"_id": material_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Material not found")
    return {"ok": True}
