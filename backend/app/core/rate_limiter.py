import time
from collections import defaultdict
from threading import Lock
from fastapi import HTTPException, status, Request

class InMemoryRateLimiter:
    """Thread-safe sliding-window rate limiter for sensitive endpoints."""
    def __init__(self, requests_per_minute: int = 20, name: str = "RateLimiter"):
        self.rpm = requests_per_minute
        self.window = 60.0
        self.name = name
        self.records: dict[str, list[float]] = defaultdict(list)
        self.lock = Lock()

    def check(self, key: str):
        now = time.time()
        with self.lock:
            # Purge entries outside window
            valid_timestamps = [t for t in self.records[key] if now - t < self.window]
            if len(valid_timestamps) >= self.rpm:
                retry_after = int(self.window - (now - valid_timestamps[0])) + 1
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Please wait {max(1, retry_after)} seconds before retrying.",
                    headers={"Retry-After": str(max(1, retry_after))}
                )
            valid_timestamps.append(now)
            self.records[key] = valid_timestamps

def get_client_ip(request: Request) -> str:
    """Extract client IP from request, taking proxy headers into account."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "127.0.0.1"

# Standard rate limiters
auth_limiter = InMemoryRateLimiter(requests_per_minute=10, name="AuthLimiter")
ai_limiter = InMemoryRateLimiter(requests_per_minute=30, name="AILimiter")
test_conn_limiter = InMemoryRateLimiter(requests_per_minute=12, name="TestConnLimiter")
