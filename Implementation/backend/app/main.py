from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import predictive
from .database import Base, engine
from .routers import upload, wells, operations, reports, mud_equipment  # or segments if separate
from .models import mud, equipment   # or whatever file you put them in


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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

@app.get("/")
def root():
    return {"message": "Backend is running"}
