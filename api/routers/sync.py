"""Sync API endpoints: trigger sync from default path or upload, and view sync status/history."""
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile, Query

from config import get_db_path, get_source_db_path
from database import get_last_sync_timestamp, get_sync_history
from import_pocketcasts import import_from_pocketcasts_db, extract_db_from_zip

from api.schemas import (
    SyncReportResponse,
    SyncStatusResponse,
    SyncHistoryEntryResponse,
)

router = APIRouter()


@router.post("/sync", response_model=SyncReportResponse)
def trigger_sync():
    """
    Trigger sync from the default Pocket Casts export path.
    Fails with 404 if the source database does not exist.
    """
    source = get_source_db_path()
    if not source.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Source database not found at {source}. Export from Pocket Casts or set POCKETCASTS_SOURCE_DB_PATH.",
        )
    target = get_db_path()
    report = import_from_pocketcasts_db(
        source,
        target_db=target,
        source_path_for_report=str(source),
    )
    return SyncReportResponse(
        sync_timestamp=report.sync_timestamp,
        source_path=report.source_path,
        podcasts_added=report.podcasts_added,
        podcasts_updated=report.podcasts_updated,
        podcasts_deleted=report.podcasts_deleted,
        episodes_added=report.episodes_added,
        episodes_updated=report.episodes_updated,
        episodes_deleted=report.episodes_deleted,
        conflicts_count=report.conflicts_count,
    )


@router.post("/sync/upload", response_model=SyncReportResponse)
async def sync_from_upload(file: UploadFile = File(..., description="Pocket Casts export ZIP file")):
    """
    Upload a Pocket Casts export ZIP and run sync.
    Accepts only ZIP files.
    """
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=400, detail="Only .zip export files are accepted.")
    target = get_db_path()
    with tempfile.TemporaryDirectory() as tmpdir:
        path = Path(tmpdir) / (file.filename or "export.zip")
        content = await file.read()
        path.write_bytes(content)
        db_path = extract_db_from_zip(str(path), extract_dir=tmpdir)
        if not db_path:
            raise HTTPException(status_code=400, detail="No database found in ZIP.")
        report = import_from_pocketcasts_db(
            Path(db_path),
            target_db=target,
            source_path_for_report=file.filename,
        )
    return SyncReportResponse(
        sync_timestamp=report.sync_timestamp,
        source_path=report.source_path,
        podcasts_added=report.podcasts_added,
        podcasts_updated=report.podcasts_updated,
        podcasts_deleted=report.podcasts_deleted,
        episodes_added=report.episodes_added,
        episodes_updated=report.episodes_updated,
        episodes_deleted=report.episodes_deleted,
        conflicts_count=report.conflicts_count,
    )


@router.get("/sync/status", response_model=SyncStatusResponse)
def get_sync_status():
    """Return last sync timestamp and optional latest sync report summary."""
    last_ts = get_last_sync_timestamp()
    history = get_sync_history(limit=1, offset=0)
    entry = history[0] if history else None
    return SyncStatusResponse(
        last_sync_timestamp=last_ts,
        last_sync_source_path=entry.get("source_path") if entry else None,
        last_sync_podcasts_added=entry.get("podcasts_added") if entry else None,
        last_sync_episodes_added=entry.get("episodes_added") if entry else None,
    )


@router.get("/sync/history", response_model=list[SyncHistoryEntryResponse])
def get_sync_history_list(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """Return sync history records, newest first."""
    rows = get_sync_history(limit=limit, offset=offset)
    return [SyncHistoryEntryResponse(**row) for row in rows]
