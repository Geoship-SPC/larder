from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import get_db, next_id, doc_to_dict

router = APIRouter()


class ComponentRatio(BaseModel):
    component_id: int
    ratio: float  # percentage 0–100, must sum to 100


class MaterialIn(BaseModel):
    name: str
    description: Optional[str] = None
    density: Optional[float] = None  # g/mL
    components: List[ComponentRatio] = []


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
        "_id":         next_id("materials"),
        "name":        payload.name,
        "description": payload.description,
        "density":     payload.density,
        "components":  [c.model_dump() for c in payload.components],
        "created_at":  datetime.utcnow(),
    }
    db.materials.insert_one(doc)
    return doc_to_dict(doc)


@router.put("/{material_id}")
def update_material(material_id: int, payload: MaterialIn):
    db = get_db()
    if not db.materials.find_one({"_id": material_id}):
        raise HTTPException(status_code=404, detail="Material not found")
    clash = db.materials.find_one({"name": payload.name, "_id": {"$ne": material_id}})
    if clash:
        raise HTTPException(status_code=409, detail=f"Material '{payload.name}' already exists")
    _validate(db, payload)
    db.materials.update_one(
        {"_id": material_id},
        {"$set": {
            "name":        payload.name,
            "description": payload.description,
            "density":     payload.density,
            "components":  [c.model_dump() for c in payload.components],
        }},
    )
    return doc_to_dict(db.materials.find_one({"_id": material_id}))


@router.delete("/{material_id}")
def delete_material(material_id: int):
    db = get_db()
    result = db.materials.delete_one({"_id": material_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Material not found")
    return {"ok": True}
