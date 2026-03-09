"""Supabase admin client using service_role key — server-side only."""
from functools import lru_cache
from supabase import create_client, Client
from config import get_settings

@lru_cache(maxsize=1)
def get_supabase() -> Client:
    s = get_settings()
    return create_client(s.supabase_url, s.supabase_service_role_key)

async def check_connection() -> bool:
    try:
        get_supabase().table("vaccines").select("id").limit(1).execute()
        return True
    except Exception:
        return False
