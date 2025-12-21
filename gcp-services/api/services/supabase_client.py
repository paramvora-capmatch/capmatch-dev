"""Supabase client singleton."""

import logging
from functools import lru_cache

from supabase import Client, create_client

from config import settings

logger = logging.getLogger(__name__)


@lru_cache()
def get_supabase_admin() -> Client:
    """
    Get Supabase admin client with service role key.

    Uses service role key for full database access (bypasses RLS).
    Should only be used for server-side operations.

    Returns:
        Supabase client instance
    """
    try:
        client = create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_SERVICE_ROLE_KEY,
        )

        logger.info(
            "Supabase admin client initialized",
            extra={"supabase_url": settings.SUPABASE_URL},
        )

        return client

    except Exception as e:
        logger.exception(
            "Failed to initialize Supabase client",
            extra={"error": str(e)},
        )
        raise


def get_supabase_anon() -> Client:
    """
    Get Supabase client with anon key.

    Uses anon key for user-level access (respects RLS).
    Used when making requests on behalf of authenticated users.

    Returns:
        Supabase client instance
    """
    try:
        client = create_client(
            supabase_url=settings.SUPABASE_URL,
            supabase_key=settings.SUPABASE_ANON_KEY,
        )

        return client

    except Exception as e:
        logger.exception(
            "Failed to initialize Supabase anon client",
            extra={"error": str(e)},
        )
        raise
