from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.database import get_db, next_id, doc_to_dict

router = APIRouter()


class SchemaProperty(BaseModel):
    key: str
    label: str
    type: str  # text | number | scale | boolean | select | multiselect
    required: bool = False
    unit: Optional[str] = None
    min: Optional[float] = None
    max: Optional[float] = None
    scale_max: Optional[int] = None
    options: Optional[List[str]] = None


class MaterialSchemaIn(BaseModel):
    name: str
    description: Optional[str] = None
    properties: List[SchemaProperty] = []


@router.post("/set-default/{schema_id}")
def set_default(schema_id: int):
    db = get_db()
    if not db.material_schemas.find_one({"_id": schema_id}):
        raise HTTPException(status_code=404, detail="Schema not found")
    db.material_schemas.update_many({}, {"$set": {"is_default": False}})
    db.material_schemas.update_one({"_id": schema_id}, {"$set": {"is_default": True}})
    return {"ok": True}


@router.delete("/default")
def clear_default():
    db = get_db()
    db.material_schemas.update_many({}, {"$set": {"is_default": False}})
    return {"ok": True}


@router.get("/")
def list_schemas():
    db = get_db()
    return [doc_to_dict(d) for d in db.material_schemas.find().sort("name", 1)]


@router.post("/")
def create_schema(payload: MaterialSchemaIn):
    db = get_db()
    if db.material_schemas.find_one({"name": payload.name}):
        raise HTTPException(status_code=409, detail=f"Schema '{payload.name}' already exists")
    doc = {
        "_id":         next_id("material_schemas"),
        "name":        payload.name,
        "description": payload.description,
        "properties":  [p.model_dump(exclude_none=True) for p in payload.properties],
        "created_at":  datetime.utcnow(),
    }
    db.material_schemas.insert_one(doc)
    return doc_to_dict(doc)


@router.put("/{schema_id}")
def update_schema(schema_id: int, payload: MaterialSchemaIn):
    db = get_db()
    if not db.material_schemas.find_one({"_id": schema_id}):
        raise HTTPException(status_code=404, detail="Schema not found")
    clash = db.material_schemas.find_one({"name": payload.name, "_id": {"$ne": schema_id}})
    if clash:
        raise HTTPException(status_code=409, detail=f"Schema '{payload.name}' already exists")
    db.material_schemas.update_one(
        {"_id": schema_id},
        {"$set": {
            "name":        payload.name,
            "description": payload.description,
            "properties":  [p.model_dump(exclude_none=True) for p in payload.properties],
        }},
    )
    return doc_to_dict(db.material_schemas.find_one({"_id": schema_id}))


@router.delete("/{schema_id}")
def delete_schema(schema_id: int):
    db = get_db()
    result = db.material_schemas.delete_one({"_id": schema_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Schema not found")
    return {"ok": True}
