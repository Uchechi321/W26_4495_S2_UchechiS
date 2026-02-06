from fastapi import FastAPI
from .database import Base, engine
from . import models
from .routers import upload

app = FastAPI()

# Include routers
app.include_router(upload.router)

# Create tables
Base.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"message": "Backend is running"}