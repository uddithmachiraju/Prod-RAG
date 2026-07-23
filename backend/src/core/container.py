from dataclasses import dataclass, field

# from src.services.embeddings.embeds import Embeddings
# from src.services.embeddings.jina_embeds import JinaEmbeddings
from src.services.embeddings.openai_embeds import OpenAIEmbeddings

# from src.services.llm.llm_model import LLMModel
from src.services.llm.openai_model import LLMModel
from src.services.notifications.manager import ConnectionManager
from src.services.parsers.base_parser import BaseParser
from src.services.parsers.pdf_parser import PDFParser
from src.services.retreival.retreive import RetrivalService
from src.services.sqs.producer import SQSProducer

# from src.services.vector_store.chroma_db import ChromaDB
from src.services.vector_store.qdrant_db import Qdrant


@dataclass
class AppContainer:
    """A Single container for all stateful components."""

    # embeddings: Embeddings = field(default=Embeddings())
    # embeddings: JinaEmbeddings = field(default=JinaEmbeddings())
    embeddings: OpenAIEmbeddings = field(default=OpenAIEmbeddings())
    parser: BaseParser = field(default=PDFParser())
    sqs_producer: SQSProducer = field(default=SQSProducer())
    # chorma_db: ChromaDB = field(default=ChromaDB())
    vector_db: Qdrant = field(default=Qdrant())
    retrieval_service: RetrivalService = field(default=RetrivalService(vector_store=vector_db, embeddings=embeddings))
    llm_service: LLMModel = field(default=LLMModel())
    connection_manager: ConnectionManager = field(default=ConnectionManager())

    def initialize(self):
        """Initialization of components."""

        # self.embedding_service = Embeddings()
        # self.embedding_service = JinaEmbeddings()
        self.embedding_service = OpenAIEmbeddings()
        self.parser_service = PDFParser()
        self.sqs_producer = SQSProducer()
        # self.chorma_db = ChromaDB()
        self.vector_db = Qdrant()
        self.retrieval_service = RetrivalService(vector_store=self.vector_db, embeddings=self.embedding_service)
        self.llm_service = LLMModel()
        self.connection_manager = ConnectionManager()


container = AppContainer()
container.initialize()


def get_embedddings() -> OpenAIEmbeddings:
    """returns the embeddings service."""

    return container.embedding_service


def get_parser() -> BaseParser:
    """returns the parser service."""

    return container.parser_service


def get_sqs_producer() -> SQSProducer:
    """returns the sqs producer service."""

    return container.sqs_producer


def get_chroma_db() -> Qdrant:
    """returns the chroma db service."""

    return container.vector_db


def get_retrieval_service() -> RetrivalService:
    """returns the retrieval service."""

    return container.retrieval_service


def get_llm_service() -> LLMModel:
    """returns the retrieval service."""

    return container.llm_service


def get_connection_manager() -> ConnectionManager:
    """returns the connection manager."""

    return container.connection_manager
