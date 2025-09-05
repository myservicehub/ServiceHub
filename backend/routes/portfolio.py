from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, status
from fastapi.responses import FileResponse
from typing import List, Optional
import os
import uuid
import shutil
from pathlib import Path
from PIL import Image
import io

from models import PortfolioItemCreate, PortfolioItem, PortfolioResponse, PortfolioItemCategory
from models.auth import User
from auth.dependencies import get_current_tradesperson, get_current_active_user
from database import database

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("/app/uploads/portfolio")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Allowed file extensions and max file size
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def validate_image_file(file: UploadFile) -> bool:
    """Validate uploaded image file"""
    # Check file extension
    file_ext = Path(file.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        return False
    
    # Check file size
    if file.size > MAX_FILE_SIZE:
        return False
    
    return True

def resize_image(image_data: bytes, max_width: int = 1200, max_height: int = 1200, quality: int = 85) -> bytes:
    """Resize and optimize image"""
    try:
        # Open image
        image = Image.open(io.BytesIO(image_data))
        
        # Convert RGBA to RGB if necessary
        if image.mode == 'RGBA':
            background = Image.new('RGB', image.size, (255, 255, 255))
            background.paste(image, mask=image.split()[-1])
            image = background
        
        # Resize if necessary
        if image.width > max_width or image.height > max_height:
            image.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
        
        # Save optimized image
        output = io.BytesIO()
        image.save(output, format='JPEG', quality=quality, optimize=True)
        return output.getvalue()
    
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")

@router.post("/upload", response_model=PortfolioItem)
async def upload_portfolio_image(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    category: PortfolioItemCategory = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_tradesperson)
):
    """Upload a new portfolio image"""
    try:
        # Validate file
        if not validate_image_file(file):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}. Max size: {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        # Read file content
        file_content = await file.read()
        
        # Resize and optimize image
        optimized_content = resize_image(file_content)
        
        # Generate unique filename
        file_ext = Path(file.filename).suffix.lower()
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Save file
        with open(file_path, "wb") as f:
            f.write(optimized_content)
        
        # Create portfolio item data
        portfolio_data = {
            "id": str(uuid.uuid4()),
            "tradesperson_id": current_user.id,
            "title": title,
            "description": description,
            "category": category,
            "image_url": f"/api/portfolio/images/{unique_filename}",
            "image_filename": unique_filename,
            "created_at": database.get_current_time(),
            "updated_at": database.get_current_time(),
            "is_public": True
        }
        
        # Save to database
        portfolio_item = await database.create_portfolio_item(portfolio_data)
        
        return PortfolioItem(**portfolio_item)
        
    except HTTPException:
        raise
    except Exception as e:
        # Clean up file if database save fails
        if 'file_path' in locals() and file_path.exists():
            file_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload image: {str(e)}"
        )

@router.get("/images/{filename}")
async def get_portfolio_image(filename: str):
    """Serve portfolio images"""
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    
    return FileResponse(
        path=file_path,
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=3600"}
    )

@router.get("/my-portfolio", response_model=PortfolioResponse)
async def get_my_portfolio(
    current_user: User = Depends(get_current_tradesperson)
):
    """Get current tradesperson's portfolio items"""
    try:
        items = await database.get_portfolio_items_by_tradesperson(current_user.id)
        portfolio_items = [PortfolioItem(**item) for item in items]
        
        return PortfolioResponse(
            items=portfolio_items,
            total=len(portfolio_items)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get portfolio: {str(e)}"
        )

@router.get("/tradesperson/{tradesperson_id}", response_model=PortfolioResponse)
async def get_tradesperson_portfolio(tradesperson_id: str):
    """Get public portfolio for a specific tradesperson"""
    try:
        # Get only public portfolio items
        items = await database.get_public_portfolio_items_by_tradesperson(tradesperson_id)
        portfolio_items = [PortfolioItem(**item) for item in items]
        
        return PortfolioResponse(
            items=portfolio_items,
            total=len(portfolio_items)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get portfolio: {str(e)}"
        )

@router.put("/{item_id}", response_model=PortfolioItem)
async def update_portfolio_item(
    item_id: str,
    title: Optional[str] = None,
    description: Optional[str] = None,
    category: Optional[PortfolioItemCategory] = None,
    is_public: Optional[bool] = None,
    current_user: User = Depends(get_current_tradesperson)
):
    """Update portfolio item details"""
    try:
        # Check if item exists and belongs to current user
        existing_item = await database.get_portfolio_item_by_id(item_id)
        if not existing_item:
            raise HTTPException(status_code=404, detail="Portfolio item not found")
        
        if existing_item["tradesperson_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to update this item")
        
        # Prepare update data
        update_data = {}
        if title is not None:
            update_data["title"] = title
        if description is not None:
            update_data["description"] = description
        if category is not None:
            update_data["category"] = category
        if is_public is not None:
            update_data["is_public"] = is_public
        
        if update_data:
            update_data["updated_at"] = database.get_current_time()
            updated_item = await database.update_portfolio_item(item_id, update_data)
            return PortfolioItem(**updated_item)
        
        return PortfolioItem(**existing_item)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update portfolio item: {str(e)}"
        )

@router.delete("/{item_id}")
async def delete_portfolio_item(
    item_id: str,
    current_user: User = Depends(get_current_tradesperson)
):
    """Delete portfolio item and associated image"""
    try:
        # Check if item exists and belongs to current user
        existing_item = await database.get_portfolio_item_by_id(item_id)
        if not existing_item:
            raise HTTPException(status_code=404, detail="Portfolio item not found")
        
        if existing_item["tradesperson_id"] != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this item")
        
        # Delete image file
        image_path = UPLOAD_DIR / existing_item["image_filename"]
        if image_path.exists():
            image_path.unlink()
        
        # Delete from database
        await database.delete_portfolio_item(item_id)
        
        return {"message": "Portfolio item deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete portfolio item: {str(e)}"
        )

@router.get("/", response_model=PortfolioResponse)
async def get_all_public_portfolio_items(
    category: Optional[PortfolioItemCategory] = None,
    limit: int = 20,
    offset: int = 0
):
    """Get all public portfolio items (for homepage showcase, etc.)"""
    try:
        items = await database.get_public_portfolio_items(
            category=category,
            limit=limit,
            offset=offset
        )
        portfolio_items = [PortfolioItem(**item) for item in items]
        
        return PortfolioResponse(
            items=portfolio_items,
            total=len(portfolio_items)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get portfolio items: {str(e)}"
        )