import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app import database
from app.routers import components, materials


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = database.get_db()
    db.material_components.create_index("name", unique=True)
    db.materials.create_index("name", unique=True)
    yield


app = FastAPI(title="Larder", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(components.router, prefix="/api/components", tags=["components"])
app.include_router(materials.router,  prefix="/api/materials",  tags=["materials"])


@app.get("/api/me")
def get_me(request: Request):
    header = request.headers.get("X-Auth-User")
    if not header:
        return {}
    try:
        return json.loads(header)
    except Exception:
        return {}


@app.get("/api/health")
def health():
    return {"status": "ok"}
