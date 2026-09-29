"""
Composition root: wires abstract interfaces to concrete implementations (Dependency Inversion).
"""
from app.core.config import get_settings
from app.infra.cache.base import KeyValueStore
from app.infra.cache.factory import get_cache_store
from app.infra.email.base import EmailSender, ConsoleSender, SmtpSender
from app.infra.events.bus import EventBus, get_event_bus


class Container:
    """Dependency injection container."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.cache: KeyValueStore = get_cache_store()
        self.event_bus: EventBus = get_event_bus()

        if self.settings.smtp_host and self.settings.smtp_user and self.settings.smtp_password:
            self.email_sender: EmailSender = SmtpSender(
                host=self.settings.smtp_host,
                port=self.settings.smtp_port,
                user=self.settings.smtp_user,
                password=self.settings.smtp_password,
                from_addr=self.settings.smtp_from,
            )
        else:
            self.email_sender = ConsoleSender()


_container: Container | None = None


def get_container() -> Container:
    global _container
    if _container is None:
        _container = Container()
    return _container
