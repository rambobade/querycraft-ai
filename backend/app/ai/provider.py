"""
LLM Provider Abstraction for QueryCraft AI
Supports OpenAI-compatible APIs, Gemini, Ollama, Groq, and Heuristic Fallbacks.
"""
import json
import re
from typing import Dict, Any, Optional
import httpx
from app.core.config import settings
from app.ai.heuristic_engine import HeuristicSQLEngine

class LLMProvider:
    async def generate_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.0
    ) -> Dict[str, Any]:
        raise NotImplementedError

class OpenAICompatibleProvider(LLMProvider):
    def __init__(self, api_key: str, api_base: str, model: str):
        self.api_key = api_key
        self.api_base = api_base.rstrip("/")
        self.model = model

    async def generate_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.0
    ) -> Dict[str, Any]:
        url = f"{self.api_base}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": temperature,
            "response_format": {"type": "json_object"}
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()
            raw_text = data["choices"][0]["message"]["content"]
            
            # Parse structured JSON
            return self._parse_json(raw_text)

    def _parse_json(self, raw_text: str) -> Dict[str, Any]:
        cleaned = raw_text.strip()
        # Strip potential markdown formatting
        if cleaned.startswith("```"):
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)
        return json.loads(cleaned)

class GeminiProvider(LLMProvider):
    def __init__(self, api_key: str, model: str = "gemini-1.5-flash"):
        self.api_key = api_key
        self.model = model

    async def generate_completion(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.0
    ) -> Dict[str, Any]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        payload = {
            "system_instruction": {
                "parts": [{"text": system_prompt}]
            },
            "contents": [{
                "parts": [{"text": user_prompt}]
            }],
            "generationConfig": {
                "temperature": temperature,
                "response_mime_type": "application/json"
            }
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            cleaned = raw_text.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
                cleaned = re.sub(r"\s*```$", "", cleaned)
            return json.loads(cleaned)

class LLMProviderFactory:
    @classmethod
    def get_provider(
        cls,
        provider_name: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        api_base: Optional[str] = None,
    ) -> Optional[LLMProvider]:
        p = (provider_name or settings.LLM_PROVIDER).lower()
        key = api_key or settings.LLM_API_KEY
        m = model or settings.LLM_MODEL
        base = api_base or settings.LLM_API_BASE

        # If explicit heuristic or no API key provided
        if p == "heuristic" or not key or key == "none":
            return None

        if p in ("openai", "groq", "ollama", "openrouter", "deepseek", "auto"):
            return OpenAICompatibleProvider(api_key=key, api_base=base, model=m)
        elif p == "gemini":
            return GeminiProvider(api_key=key, model=m or "gemini-1.5-flash")
        
        return OpenAICompatibleProvider(api_key=key, api_base=base, model=m)
