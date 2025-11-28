import os
import json
import time

try:
    import redis.asyncio as redis
except Exception:
    redis = None


class Cache:
    def __init__(self):
        self.enabled = os.getenv("CACHE_ENABLED", "true").lower() in ("1", "true", "yes")
        self.redis_url = os.getenv("REDIS_URL")
        self._client = None
        self._client_initialized = False
        self._local = {}

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


_global_cache: Cache | None = None


def get_cache() -> Cache:
    global _global_cache
    if _global_cache is None:
        _global_cache = Cache()
    return _global_cache