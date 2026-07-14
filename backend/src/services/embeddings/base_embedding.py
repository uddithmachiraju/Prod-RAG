from abc import ABC
from typing import Union


class Embeddings(ABC):
    """A class for generating embeddings for text data."""

    def __init__(self):
        pass

    async def get_embeddings(self, texts: Union[str, list[str]]) -> list[list[float]]:
        """Get embeddings for a list of texts."""
        raise NotImplementedError("This method should be implemented by subclasses.")
