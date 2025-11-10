import os
from typing import Any, Dict

import httpx


class AgentOrchestrator:
    """Minimal proxy responsible for communicating with DeepAgents."""

    def __init__(self) -> None:
        base_url = os.environ.get("DEEPAGENTS_URL", "http://108.130.44.215:8000").rstrip("/")
        timeout_raw = os.environ.get("DEEPAGENTS_TIMEOUT", "600")

        try:
            self.timeout_seconds = float(timeout_raw)
        except ValueError:
            self.timeout_seconds = 600.0

        self.chat_url = f"{base_url}/api/v1/chat"
        self.state_url = f"{base_url}/api/v1/state"

    async def send_chat(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Forward chat payloads to DeepAgents and return the JSON response.

        Parameters
        ----------
        payload:
            Dict containing the DeepAgents fields (user_query, agent_name, thread_id).
        """
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.post(self.chat_url, json=payload)
            response.raise_for_status()
            return response.json()

    async def get_state(self, thread_id: str) -> Dict[str, Any]:
        """
        Fetch the latest state for a DeepAgents thread.

        Parameters
        ----------
        thread_id:
            The persistent identifier used in previous chat invocations.
        """
        url = f"{self.state_url}/{thread_id}"
        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.get(url)
            response.raise_for_status()
            return response.json()
