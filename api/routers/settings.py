"""Settings API endpoints (e.g. OPML import, duplicate cleanup)."""
from fastapi import APIRouter, File, HTTPException, UploadFile

from api.schemas import OPMLImportResponse, RemoveDuplicatesResponse
from api.services.opml_import import import_opml
from api.services.duplicate_cleanup import remove_duplicate_podcasts

router = APIRouter()


@router.post("/opml/import", response_model=OPMLImportResponse)
async def opml_import(file: UploadFile = File(..., description="OPML file")):
    """
    Upload an OPML file to import podcast subscriptions.
    Parses the file, finds missing podcasts, and enriches metadata from RSS feeds.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided.")
    lower = file.filename.lower()
    if not (lower.endswith(".opml") or lower.endswith(".xml")):
        raise HTTPException(
            status_code=400,
            detail="Only .opml or .xml files are accepted.",
        )
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="File is empty.")
    report = import_opml(content)
    return OPMLImportResponse(
        podcasts_found=report.podcasts_found,
        podcasts_added=report.podcasts_added,
        podcasts_updated=report.podcasts_updated,
        metadata_enriched=report.metadata_enriched,
        errors=report.errors,
    )


@router.post("/podcasts/remove-duplicates", response_model=RemoveDuplicatesResponse)
def remove_duplicates():
    """
    Remove duplicate podcasts: for each feed URL, keep the podcast that has episodes,
    delete the ones with 0 episodes (e.g. created by OPML import).
    """
    report = remove_duplicate_podcasts()
    return RemoveDuplicatesResponse(
        deleted_count=report.deleted_count,
        deleted_titles=report.deleted_titles,
    )
