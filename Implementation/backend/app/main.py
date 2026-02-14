from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import Base, engine
from .routers import upload, wells, operations  # or segments if separate

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

Base.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"message": "Backend is running"}
