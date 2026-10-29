from fastapi import APIRouter, HTTPException, Response
from pathlib import Path

router = APIRouter(prefix="/sample-site", tags=["Sample Site"])


@router.get("/{filename}")
def get_sample_page(filename: str):
    sample_dir = Path(__file__).resolve().parent.parent / "sample_site"
    safe_name = Path(filename).name
    file_path = sample_dir / safe_name
    
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail=f"Sample page '{safe_name}' not found.")
        
    media_type = "text/plain" if safe_name.endswith(".txt") else "text/html; charset=utf-8"
    content = file_path.read_text(encoding="utf-8")
    return Response(content=content, media_type=media_type)
