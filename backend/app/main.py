"""FastAPI application entry point."""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Comma-separated list of origins allowed to call this API from a browser.
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000")

app = FastAPI(title="Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in CORS_ORIGINS.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/hello")
def hello() -> dict[str, str]:
    """Proves the frontend can reach the backend."""
    return {"message": "Hello from FastAPI"}
