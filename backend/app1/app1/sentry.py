"""
Sentry Configuration for Django Backend

Initializes Sentry SDK with environment-driven configuration.
Import this module early in settings.py to enable error tracking.
"""

import os
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration


def _before_send(event, hint):
    """
    Scrub sensitive data from events before sending to Sentry.
    
    Removes:
    - Authorization headers
    - Cookie headers
    - Session tokens
    """
    # Scrub request headers
    if "request" in event:
        headers = event["request"].get("headers", {})
        headers.pop("Cookie", None)
        headers.pop("Authorization", None)
        headers.pop("X-CSRFToken", None)
        event["request"]["headers"] = headers
        
        # Scrub query params if they contain tokens
        if "query_string" in event["request"]:
            query = event["request"]["query_string"]
            if isinstance(query, str) and ("token=" in query or "key=" in query):
                event["request"]["query_string"] = "[Filtered]"
    
    # Scrub breadcrumbs
    if "breadcrumbs" in event:
        for breadcrumb in event["breadcrumbs"]:
            if "data" in breadcrumb and "headers" in breadcrumb["data"]:
                breadcrumb["data"]["headers"].pop("Cookie", None)
                breadcrumb["data"]["headers"].pop("Authorization", None)
    
    return event


def init_sentry():
    """
    Initialize Sentry SDK with Django integration.
    
    Environment variable:
    - SENTRY_DSN: Sentry project DSN (required to enable)
    """
    sentry_dsn = os.environ.get("SENTRY_DSN")
    
    if not sentry_dsn:
        # Sentry disabled when DSN not provided
        return
    
    sentry_sdk.init(
        dsn=sentry_dsn,
        integrations=[
            DjangoIntegration(
                transaction_style="url",
                middleware_spans=True,
                signals_spans=True,
            ),
        ],
        environment=os.environ.get("DJANGO_ENV", "development"),
        traces_sample_rate=0.1,
        before_send=_before_send,
        # Ignore common health check and static file requests
        ignore_errors=[
            "ConnectionResetError",
            "BrokenPipeError",
        ],
    )
