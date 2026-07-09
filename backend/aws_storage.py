"""
NoelCast — AWS S3 Storage Helper
Handles uploading and downloading the FAISS index and metadata
to/from Amazon S3 (Free Tier bucket).
"""

import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# ── Config (from env) ──────────────────────────────────────────────────────────
S3_BUCKET = os.getenv("S3_BUCKET_NAME", "noelcast-rag-index")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

# S3 keys for the two index files
S3_INDEX_KEY = "rag/faiss.index"
S3_META_KEY = "rag/stations_meta.json"


def _get_client():
    """Create a boto3 S3 client. Credentials come from env vars."""
    try:
        import boto3  # type: ignore
        return boto3.client(
            "s3",
            region_name=AWS_REGION,
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
        )
    except ImportError:
        raise RuntimeError("boto3 is not installed. Run: pip install boto3")


def upload_index(index_path: str, meta_path: str) -> bool:
    """
    Upload the FAISS index and station metadata JSON to S3.
    Returns True on success, False on failure.
    """
    if not os.getenv("AWS_ACCESS_KEY_ID"):
        logger.warning("AWS credentials not set — skipping S3 upload.")
        return False

    try:
        client = _get_client()

        logger.info("Uploading FAISS index to s3://%s/%s ...", S3_BUCKET, S3_INDEX_KEY)
        client.upload_file(index_path, S3_BUCKET, S3_INDEX_KEY)

        logger.info("Uploading station metadata to s3://%s/%s ...", S3_BUCKET, S3_META_KEY)
        client.upload_file(meta_path, S3_BUCKET, S3_META_KEY)

        logger.info("✅ RAG index uploaded to S3 successfully.")
        return True

    except Exception as exc:
        logger.error("S3 upload failed: %s", exc)
        return False


def download_index(index_dest: str, meta_dest: str) -> bool:
    """
    Download the FAISS index and station metadata JSON from S3.
    Returns True on success, False on failure (e.g. bucket empty or no creds).
    """
    if not os.getenv("AWS_ACCESS_KEY_ID"):
        logger.info("AWS credentials not configured — will use local index only.")
        return False

    try:
        client = _get_client()

        Path(index_dest).parent.mkdir(parents=True, exist_ok=True)
        Path(meta_dest).parent.mkdir(parents=True, exist_ok=True)

        logger.info("Downloading FAISS index from S3...")
        client.download_file(S3_BUCKET, S3_INDEX_KEY, index_dest)

        logger.info("Downloading station metadata from S3...")
        client.download_file(S3_BUCKET, S3_META_KEY, meta_dest)

        logger.info("✅ RAG index downloaded from S3 successfully.")
        return True

    except Exception as exc:
        logger.warning("S3 download failed (will fall back to local): %s", exc)
        return False


def index_exists_in_s3() -> bool:
    """Check whether the FAISS index already exists in S3."""
    if not os.getenv("AWS_ACCESS_KEY_ID"):
        return False
    try:
        client = _get_client()
        client.head_object(Bucket=S3_BUCKET, Key=S3_INDEX_KEY)
        return True
    except Exception:
        return False
