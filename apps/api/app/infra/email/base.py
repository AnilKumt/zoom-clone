"""
Email sending abstraction: ConsoleSender for dev/evaluators and SmtpSender for prod.
"""
from typing import Protocol
import logging

logger = logging.getLogger("email")


class EmailSender(Protocol):
    async def send(self, to: str, subject: str, body: str) -> None: ...


class ConsoleSender:
    """Logs email/OTP to console — perfect for demo builds and test evaluators."""

    async def send(self, to: str, subject: str, body: str) -> None:
        logger.info(f"\n======== [DEV EMAIL SENDER] ========\nTo: {to}\nSubject: {subject}\nBody: {body}\n====================================")


class SmtpSender:
    """SMTP email sender."""

    def __init__(self, host: str, port: int, user: str, password: str, from_addr: str) -> None:
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.from_addr = from_addr

    async def send(self, to: str, subject: str, body: str) -> None:
        import smtplib
        from email.message import EmailMessage

        msg = EmailMessage()
        msg["Subject"] = subject
        msg["From"] = self.from_addr
        msg["To"] = to
        msg.set_content(body)

        with smtplib.SMTP(self.host, self.port) as server:
            server.starttls()
            server.login(self.user, self.password)
            server.send_message(msg)
