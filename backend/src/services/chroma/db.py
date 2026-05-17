import chromadb

from src.config.logging import get_logger
from src.config.settings import get_settings

logger = get_logger(__name__)
settings = get_settings()

chroma_client = chromadb.CloudClient(
  api_key=settings.CHROMA_DB_API_KEY,
  tenant=settings.CHROMA_DB_TENANT,
  database=settings.CHROMA_DB_DATABASE
)

class ChromaDB:
    """ChromaDB is a wrapper around the Chroma vector database client."""

    def __init__(self) -> None:
      self.client = chroma_client      

    
    def health_check(self) -> bool:
      """Health check for the ChromaDB client."""
      try:
        self.client.heartbeat()
        logger.info("ChromaDB health check passed.")
        return True
      except Exception as e:
        logger.error("ChromaDB health check failed", error=str(e))
        return False

