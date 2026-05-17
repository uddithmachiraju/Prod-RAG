from dataclasses import dataclass, field

from src.services.embeddings.embeds import Embeddings
from src.services.parsers.base_parser import BaseParser
from src.services.parsers.pdf_parser import PDFParser
from src.services.sqs.producer import SQSProducer


@dataclass
class AppContainer:
    """A Single container for all stateful components."""

    embeddings: Embeddings | None = field(default=None)
    parser: BaseParser | None = field(default=None)
    sqs_producer: SQSProducer = field(default=SQSProducer())

    def initialize(self):
        """Initialization of components."""

        self.embedding_service = Embeddings()
        self.parser_service = PDFParser()
        self.sqs_producer = SQSProducer()


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