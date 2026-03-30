from datetime import datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, UploadFile, File, Response
from pydantic import BaseModel
from bson import ObjectId
import gridfs

from app.database import get_db, next_id, doc_to_dict

router = APIRouter()


class ComponentIn(BaseModel):
    name: str
    description: Optional[str] = None
    schema_values: Optional[dict] = None


@router.get("/")
def list_components():
    db = get_db()
    return [doc_to_dict(d) for d in db.material_components.find().sort("name", 1)]


@router.post("/")
def create_component(payload: ComponentIn):
    db = get_db()
    if db.material_components.find_one({"name": payload.name}):
        raise HTTPException(status_code=409, detail=f"Component '{payload.name}' already exists")
    doc = {
        "_id":          next_id("material_components"),
        "name":         payload.name,
        "description":  payload.description,
        "schema_values": payload.schema_values or {},
        "documents":    [],
        "created_at":   datetime.utcnow(),
    }
    db.material_components.insert_one(doc)
    return doc_to_dict(doc)


@router.put("/{component_id}")
def update_component(component_id: int, payload: ComponentIn):
    db = get_db()
    existing = db.material_components.find_one({"_id": component_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Component not found")
    clash = db.material_components.find_one({"name": payload.name, "_id": {"$ne": component_id}})
    if clash:
        raise HTTPException(status_code=409, detail=f"Component '{payload.name}' already exists")
    db.material_components.update_one(
        {"_id": component_id},
        {"$set": {"name": payload.name, "description": payload.description, "schema_values": payload.schema_values or {}}},
    )
    return doc_to_dict(db.material_components.find_one({"_id": component_id}))


@router.delete("/{component_id}")
def delete_component(component_id: int):
    db = get_db()
    existing = db.material_components.find_one({"_id": component_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Component not found")
    used = db.materials.find_one({"components.component_id": component_id})
    if used:
        raise HTTPException(
            status_code=409,
            detail=f"Component is used in material '{used['name']}' — remove it from all materials first",
        )
    fs = gridfs.GridFS(db)
    for doc_ref in existing.get("documents", []):
        try:
            fs.delete(ObjectId(doc_ref["id"]))
        except Exception:
            pass
    db.material_components.delete_one({"_id": component_id})
    return {"ok": True}


@router.post("/{component_id}/documents")
async def upload_document(component_id: int, file: UploadFile = File(...)):
    db = get_db()
    if not db.material_components.find_one({"_id": component_id}):
        raise HTTPException(status_code=404, detail="Component not found")
    content = await file.read()
    fs = gridfs.GridFS(db)
    file_id = fs.put(
        content,
        filename=file.filename,
        content_type=file.content_type or "application/octet-stream",
    )
    doc_ref = {
        "id":           str(file_id),
        "name":         file.filename,
        "content_type": file.content_type or "application/octet-stream",
        "size":         len(content),
        "uploaded_at":  datetime.utcnow().isoformat(),
    }
    db.material_components.update_one(
        {"_id": component_id},
        {"$push": {"documents": doc_ref}},
    )
    return doc_ref


@router.delete("/{component_id}/documents/{doc_id}")
def delete_document(component_id: int, doc_id: str):
    db = get_db()
    if not db.material_components.find_one({"_id": component_id}):
        raise HTTPException(status_code=404, detail="Component not found")
    fs = gridfs.GridFS(db)
    try:
        fs.delete(ObjectId(doc_id))
    except Exception:
        pass
    db.material_components.update_one(
        {"_id": component_id},
        {"$pull": {"documents": {"id": doc_id}}},
    )
    return {"ok": True}


@router.get("/{component_id}/documents/{doc_id}")
def download_document(component_id: int, doc_id: str):
    db = get_db()
    fs = gridfs.GridFS(db)
    try:
        grid_out = fs.get(ObjectId(doc_id))
    except Exception:
        raise HTTPException(status_code=404, detail="Document not found")
    content = grid_out.read()
    filename = grid_out.filename or "document"
    content_type = getattr(grid_out, "content_type", None) or "application/octet-stream"
    return Response(
        content=content,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
