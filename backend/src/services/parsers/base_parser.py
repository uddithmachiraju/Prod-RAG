from abc import ABC, abstractmethod
from typing import Any, Dict

from src.schemas.document import Document


class BaseParser(ABC):
    """Base Parser class for all different kinds of parsers."""

    def __init__(self):
        """initilization of the class"""

        pass

    @abstractmethod
    async def parse(self, user_id: str, file_metadata: Dict[str, Any]) -> Document:
        pass
