from dataclasses import dataclass, field

from src.services.chroma.db import ChromaDB
from src.services.embeddings.embeds import Embeddings
from src.services.llm.claude_model import ClaudeModel
from src.services.parsers.base_parser import BaseParser
from src.services.parsers.pdf_parser import PDFParser
from src.services.retreival.retreive import RetrivalService
from src.services.sqs.producer import SQSProducer


@dataclass
class AppContainer:
    """A Single container for all stateful components."""

    embeddings: Embeddings = field(default=Embeddings())
    parser: BaseParser = field(default=PDFParser())
    sqs_producer: SQSProducer = field(default=SQSProducer())
    chorma_db: ChromaDB = field(default=ChromaDB())
    retrieval_service: RetrivalService = field(default=RetrivalService(vector_store=chorma_db, embeddings=embeddings))
    llm_service: ClaudeModel = field(default=ClaudeModel())

    def initialize(self):
        """Initialization of components."""

        self.embedding_service = Embeddings()
        self.parser_service = PDFParser()
        self.sqs_producer = SQSProducer()
        self.chorma_db = ChromaDB()
        self.retrieval_service = RetrivalService(vector_store=self.chorma_db, embeddings=self.embedding_service)
        self.llm_service = ClaudeModel()


container = AppContainer()
container.initialize()


def get_embedddings() -> Embeddings:
    """returns the embeddings service."""

    return container.embedding_service


def get_parser() -> BaseParser:
    """returns the parser service."""

    return container.parser_service


def get_sqs_producer() -> SQSProducer:
    """returns the sqs producer service."""

    return container.sqs_producer


def get_chroma_db() -> ChromaDB:
    """returns the chroma db service."""

    return container.chorma_db


def get_retrieval_service() -> RetrivalService:
    """returns the retrieval service."""

    return container.retrieval_service


def get_llm_service() -> ClaudeModel:
    """returns the retrieval service."""

    return container.llm_service
