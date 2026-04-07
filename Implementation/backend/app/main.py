from pathlib import Path

from dotenv import load_dotenv

# Load .env from backend/ first, then Implementation/ (one level up). override=True so
# values from file win over empty OPENAI_* placeholders in the OS environment.
_backend_dir = Path(__file__).resolve().parent.parent
for _env_path in (_backend_dir / ".env", _backend_dir.parent / ".env"):
    if _env_path.is_file():
        load_dotenv(_env_path, override=True)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine, add_mud_desc_column_if_missing, add_owner_email_column_if_missing
from .auth_scope import bootstrap_legacy_well_owners
from .routers import upload, wells, operations, reports, mud_equipment
from .models import mud, equipment   # or whatever file you put them in


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router)
app.include_router(wells.router)
app.include_router(operations.router)
app.include_router(reports.router)
app.include_router(mud_equipment.router)
Base.metadata.create_all(bind=engine)
add_owner_email_column_if_missing()
bootstrap_legacy_well_owners(engine)
add_mud_desc_column_if_missing()

@app.get("/")
def root():
    return {"message": "Backend is running"}
