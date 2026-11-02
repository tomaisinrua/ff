"""Push notification backends. Configure exactly one (or several) via env."""
from __future__ import annotations

import logging
import os

import requests

log = logging.getLogger("notify")


class Notifier:
    """Fan-out notifier. Any backend left unconfigured is silently skipped."""

    def __init__(self) -> None:
        self.ntfy_topic = os.getenv("NTFY_TOPIC", "").strip()
        self.ntfy_server = os.getenv("NTFY_SERVER", "https://ntfy.sh").rstrip("/")
        self.telegram_token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
        self.telegram_chat = os.getenv("TELEGRAM_CHAT_ID", "").strip()
        self.pushover_token = os.getenv("PUSHOVER_APP_TOKEN", "").strip()
        self.pushover_user = os.getenv("PUSHOVER_USER_KEY", "").strip()
        self.webhook_url = os.getenv("WEBHOOK_URL", "").strip()

    @property
    def configured(self) -> bool:
        return bool(
            self.ntfy_topic
            or (self.telegram_token and self.telegram_chat)
            or (self.pushover_token and self.pushover_user)
            or self.webhook_url
        )

    def send(self, title: str, message: str, *, urgent: bool = False, url: str = "") -> None:
        """Best-effort push. Never raises: a dead notifier must not kill the watcher."""
        for fn in (self._ntfy, self._telegram, self._pushover, self._webhook):
            try:
                fn(title, message, urgent, url)
            except Exception as exc:  # noqa: BLE001 - best effort by design
                log.warning("%s failed: %s", fn.__name__, exc)

    def _ntfy(self, title: str, message: str, urgent: bool, url: str) -> None:
        if not self.ntfy_topic:
            return
        headers = {
            "Title": title,
            "Priority": "urgent" if urgent else "default",
            "Tags": "shopping_cart",
        }
        if url:
            # Tapping the notification opens the bag straight in the TGTG app.
            headers["Click"] = url
            headers["Actions"] = f"view, Open in TGTG, {url}"
        requests.post(
            f"{self.ntfy_server}/{self.ntfy_topic}",
            data=message.encode("utf-8"),
            headers=headers,
            timeout=10,
        ).raise_for_status()

    def _telegram(self, title: str, message: str, urgent: bool, url: str) -> None:
        if not (self.telegram_token and self.telegram_chat):
            return
        text = f"*{title}*\n{message}"
        if url:
            text += f"\n{url}"
        requests.post(
            f"https://api.telegram.org/bot{self.telegram_token}/sendMessage",
            json={
                "chat_id": self.telegram_chat,
                "text": text,
                "parse_mode": "Markdown",
                "disable_notification": not urgent,
            },
            timeout=10,
        ).raise_for_status()

    def _pushover(self, title: str, message: str, urgent: bool, url: str) -> None:
        if not (self.pushover_token and self.pushover_user):
            return
        payload = {
            "token": self.pushover_token,
            "user": self.pushover_user,
            "title": title,
            "message": message,
            "priority": 1 if urgent else 0,
        }
        if url:
            payload["url"] = url
            payload["url_title"] = "Open in TGTG"
        requests.post(
            "https://api.pushover.net/1/messages.json", data=payload, timeout=10
        ).raise_for_status()

    def _webhook(self, title: str, message: str, urgent: bool, url: str) -> None:
        if not self.webhook_url:
            return
        requests.post(
            self.webhook_url,
            json={"title": title, "message": message, "urgent": urgent, "url": url},
            timeout=10,
        ).raise_for_status()
