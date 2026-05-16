from abc import ABC, abstractmethod
from typing import List

from src.schemas.document import DocumentChunk


class BaseParser(ABC):
    """Base Parser class for all different kinds of parsers."""

    def __init__(self):
        """initilization of the class"""

        pass

    @abstractmethod
    async def parse(self, file_bytes: bytes) -> list[DocumentChunk]:
        pass
