import os
import json
import time
import logging
from urllib.parse import urlparse

try:
    import redis.asyncio as redis
except Exception:
    redis = None

logger = logging.getLogger(__name__)

class Cache:
    def __init__(self):
        self.enabled = os.getenv("CACHE_ENABLED", "true").lower() in ("1", "true", "yes")
        self.redis_url = os.getenv("REDIS_URL")
        self._client = None
        self._client_initialized = False
        self._local = {}
        self._logged_init = False

    async def _ensure_client(self):
        if self._client_initialized:
            return
        self._client_initialized = True
        if self.redis_url and redis is not None:
            try:
                self._client = redis.from_url(
                    self.redis_url,
                    encoding="utf-8",
                    decode_responses=True,
                )
            except Exception:
                self._client = None

        # One-time startup log to indicate cache backend
        if not self._logged_init:
            if not self.enabled:
                logger.info("Caching disabled (CACHE_ENABLED=false). Using direct DB access.")
            elif self._client is not None:
                host_info = None
                try:
                    parsed = urlparse(self.redis_url or "")
                    if parsed.hostname:
                        host_info = f"{parsed.hostname}:{parsed.port or ''}".rstrip(":")
                except Exception:
                    host_info = None
                if host_info:
                    logger.info(f"Caching enabled: Redis client active (host={host_info}).")
                else:
                    logger.info("Caching enabled: Redis client active.")
            else:
                logger.info("Caching enabled: using in-memory cache (Redis unavailable).")
            self._logged_init = True

    async def get(self, key: str):
        if not self.enabled:
            return None
        await self._ensure_client()
        if self._client is not None:
            try:
                return await self._client.get(key)
            except Exception:
                pass
        entry = self._local.get(key)
        if not entry:
            return None
        exp, val = entry
        if exp is not None and exp < time.time():
            self._local.pop(key, None)
            return None
        return val

    async def set(self, key: str, value, ttl: int | None = None):
        if not self.enabled:
            return False
        await self._ensure_client()
        if self._client is not None:
            try:
                if ttl:
                    await self._client.setex(key, int(ttl), value)
                else:
                    await self._client.set(key, value)
                return True
            except Exception:
                pass
        exp = time.time() + ttl if ttl else None
        self._local[key] = (exp, value)
        return True

    async def get_json(self, key: str):
        val = await self.get(key)
        if val is None:
            return None
        try:
            if isinstance(val, str):
                return json.loads(val)
            return val
        except Exception:
            return None

    async def set_json(self, key: str, obj, ttl: int | None = None):
        try:
            payload = json.dumps(obj)
        except Exception:
            payload = obj
        return await self.set(key, payload, ttl)

    async def delete(self, key: str):
        if not self.enabled:
            return False
        await self._ensure_client()
        if self._client is not None:
            try:
                await self._client.delete(key)
                return True
            except Exception:
                pass
        self._local.pop(key, None)
        return True


_global_cache: Cache | None = None


def get_cache() -> Cache:
    global _global_cache
    if _global_cache is None:
        _global_cache = Cache()
    return _global_cache