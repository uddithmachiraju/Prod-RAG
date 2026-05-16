from contextlib import asynccontextmanager
from time import time

import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.api.auth.router import router as auth_router
from src.api.documents.router import router as document_router
from src.api.ingestion.router import router as ingestion_router
from src.config.logging import get_logger, setup_logging
from src.config.settings import get_settings
from src.core.container import container, get_embedddings
from src.db.mongo_db import check_db_health, close_db

settings = get_settings()
setup_logging()
logger = get_logger(__name__)
embeddings_service = get_embedddings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("app_starting", env=settings.ENV, version=settings.APP_VERSION)

    container.initialize()
    logger.info("initialized all service components", env=settings.ENV, version=settings.APP_VERSION)

    if not await check_db_health():
        logger.error("database_connection_failed", env=settings.ENV, version=settings.APP_VERSION)
        raise RuntimeError("Failed to connect to the database. Check logs for details.")

    if not embeddings_service.health_check():
        logger.error("embeddings_service_connection_failed", env=settings.ENV, version=settings.APP_VERSION)
        raise RuntimeError("Failed to connect to the embeddings service. Check logs for details.")

    yield
    await close_db()
    logger.info("app_stopping", env=settings.ENV, version=settings.APP_VERSION)


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGIN,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time()
    response = await call_next(request)
    process_time = time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("unhandled_exception", error=str(exc), path=request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": f"An unexpected error occurred {str(exc)}.",
        },
    )


app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(ingestion_router, prefix="/ingestion", tags=["Ingestion"])
app.include_router(document_router, prefix="/documents", tags=["Documents"])


if __name__ == "__main__":
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
