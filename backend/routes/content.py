from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from fastapi.security import HTTPBearer
from typing import List, Optional
from datetime import datetime
import logging

from database import database
from models.content import (
    ContentItem, ContentCreate, ContentUpdate, ContentAnalytics, 
    ContentComment, MediaFile, ContentTemplate, ContentWorkflow,
    ContentType, ContentStatus, ContentCategory, ContentVisibility,
    ContentStatistics, generate_slug, extract_template_variables, validate_content_settings
)
from models.admin import AdminPermission
from routes.admin_management import get_current_admin, require_permission

logger = logging.getLogger(__name__)
security = HTTPBearer()

router = APIRouter(prefix="/api/admin/content", tags=["content_management"])

# Content CRUD Operations

@router.get("/items")
async def get_content_items(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    content_type: Optional[ContentType] = None,
    status: Optional[ContentStatus] = None,
    category: Optional[ContentCategory] = None,
    search: Optional[str] = None,
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_POLICIES))
):
    """Get all content items with filtering and pagination"""
    
    try:
        filters = {}
        if content_type:
            filters["content_type"] = content_type.value
        if status:
            filters["status"] = status.value
        if category:
            filters["category"] = category.value
        if search:
            filters["$or"] = [
                {"title": {"$regex": search, "$options": "i"}},
                {"content": {"$regex": search, "$options": "i"}},
                {"tags": {"$in": [search]}}
            ]
        
        content_items = await database.get_content_items(filters, skip, limit)
        total_count = await database.get_content_items_count(filters)
        
        return {
            "content_items": content_items,
            "pagination": {
                "skip": skip,
                "limit": limit,
                "total": total_count,
                "has_more": skip + limit < total_count
            }
        }
    except Exception as e:
        logger.error(f"Error getting content items: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch content items")

@router.get("/items/{content_id}")
async def get_content_item(
    content_id: str,
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_POLICIES))
):
    """Get a specific content item by ID"""
    
    content_item = await database.get_content_item_by_id(content_id)
    if not content_item:
        raise HTTPException(status_code=404, detail="Content item not found")
    
    return {"content_item": content_item}

@router.post("/items")
async def create_content_item(
    content_data: ContentCreate,
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_POLICIES))
):
    """Create a new content item"""
    
    try:
        # Generate slug if not provided
        if not content_data.slug:
            content_data.slug = generate_slug(content_data.title)
        
        # Check if slug already exists
        existing_item = await database.get_content_item_by_slug(content_data.slug)
        if existing_item:
            # Generate unique slug
            counter = 1
            base_slug = content_data.slug
            while existing_item:
                content_data.slug = f"{base_slug}-{counter}"
                existing_item = await database.get_content_item_by_slug(content_data.slug)
                counter += 1
        
        # Validate content-specific settings
        if not validate_content_settings(content_data.content_type, content_data.settings):
            raise HTTPException(status_code=400, detail="Invalid settings for content type")
        
        # Extract template variables if content contains them
        template_vars = extract_template_variables(content_data.content)
        if template_vars:
            content_data.template_variables = template_vars
        
        # Create content item
        content_item = ContentItem(
            **content_data.dict(),
            created_by=admin["id"]
        )
        
        content_id = await database.create_content_item(content_item.dict())
        
        # Log activity
        await database.log_admin_activity(
            admin["id"], admin["username"], "create_content",
            f"Created {content_data.content_type} content: {content_data.title}",
            target_id=content_id, target_type="content"
        )
        
        return {
            "message": "Content item created successfully",
            "content_id": content_id,
            "slug": content_data.slug
        }
        
    except Exception as e:
        logger.error(f"Error creating content item: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create content item")

@router.put("/items/{content_id}")
async def update_content_item(
    content_id: str,
    update_data: ContentUpdate,
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_POLICIES))
):
    """Update a content item"""
    
    try:
        # Check if content exists
        existing_item = await database.get_content_item_by_id(content_id)
        if not existing_item:
            raise HTTPException(status_code=404, detail="Content item not found")
        
        # Prepare update data
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        
        # Handle slug update
        if update_data.slug and update_data.slug != existing_item.get("slug"):
            existing_slug = await database.get_content_item_by_slug(update_data.slug)
            if existing_slug and existing_slug["id"] != content_id:
                raise HTTPException(status_code=400, detail="Slug already exists")
        
        # Validate settings if updated
        if update_data.settings is not None:
            content_type = update_data.content_type or ContentType(existing_item["content_type"])
            if not validate_content_settings(content_type, update_data.settings):
                raise HTTPException(status_code=400, detail="Invalid settings for content type")
        
        # Extract template variables if content is updated
        if update_data.content:
            template_vars = extract_template_variables(update_data.content)
            if template_vars:
                update_dict["template_variables"] = template_vars
        
        # Add metadata
        update_dict["updated_at"] = datetime.utcnow()
        update_dict["updated_by"] = admin["id"]
        
        # Update content item
        success = await database.update_content_item(content_id, update_dict)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update content item")
        
        # Log activity
        await database.log_admin_activity(
            admin["id"], admin["username"], "update_content",
            f"Updated content: {existing_item.get('title', content_id)}",
            target_id=content_id, target_type="content"
        )
        
        return {"message": "Content item updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating content item: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update content item")

@router.delete("/items/{content_id}")
async def delete_content_item(
    content_id: str,
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_POLICIES))
):
    """Delete a content item"""
    
    try:
        # Check if content exists
        existing_item = await database.get_content_item_by_id(content_id)
        if not existing_item:
            raise HTTPException(status_code=404, detail="Content item not found")
        
        # Soft delete by archiving
        success = await database.update_content_item(content_id, {
            "status": ContentStatus.ARCHIVED.value,
            "updated_at": datetime.utcnow(),
            "updated_by": admin["id"]
        })
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete content item")
        
        # Log activity
        await database.log_admin_activity(
            admin["id"], admin["username"], "delete_content",
            f"Deleted content: {existing_item.get('title', content_id)}",
            target_id=content_id, target_type="content"
        )
        
        return {"message": "Content item deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting content item: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete content item")

# Bulk Operations

@router.post("/items/bulk-update")
async def bulk_update_content(
    content_ids: List[str],
    update_data: ContentUpdate,
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_POLICIES))
):
    """Bulk update multiple content items"""
    
    try:
        update_dict = {k: v for k, v in update_data.dict().items() if v is not None}
        update_dict["updated_at"] = datetime.utcnow()
        update_dict["updated_by"] = admin["id"]
        
        updated_count = await database.bulk_update_content_items(content_ids, update_dict)
        
        # Log activity
        await database.log_admin_activity(
            admin["id"], admin["username"], "bulk_update_content",
            f"Bulk updated {updated_count} content items",
            metadata={"content_ids": content_ids, "update_fields": list(update_dict.keys())}
        )
        
        return {
            "message": f"Successfully updated {updated_count} content items",
            "updated_count": updated_count
        }
        
    except Exception as e:
        logger.error(f"Error bulk updating content: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to bulk update content items")

# Publishing & Scheduling

@router.post("/items/{content_id}/publish")
async def publish_content(
    content_id: str,
    publish_date: Optional[datetime] = None,
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_POLICIES))
):
    """Publish content item immediately or schedule for later"""
    
    try:
        existing_item = await database.get_content_item_by_id(content_id)
        if not existing_item:
            raise HTTPException(status_code=404, detail="Content item not found")
        
        # Determine status
        status = ContentStatus.PUBLISHED.value
        if publish_date and publish_date > datetime.utcnow():
            status = ContentStatus.SCHEDULED.value
        
        update_data = {
            "status": status,
            "publish_date": publish_date or datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "updated_by": admin["id"]
        }
        
        success = await database.update_content_item(content_id, update_data)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to publish content")
        
        # Log activity
        action = "schedule_content" if status == ContentStatus.SCHEDULED.value else "publish_content"
        description = f"{'Scheduled' if status == ContentStatus.SCHEDULED.value else 'Published'} content: {existing_item.get('title')}"
        
        await database.log_admin_activity(
            admin["id"], admin["username"], action, description,
            target_id=content_id, target_type="content"
        )
        
        return {
            "message": f"Content {'scheduled' if status == ContentStatus.SCHEDULED.value else 'published'} successfully",
            "status": status,
            "publish_date": publish_date or datetime.utcnow()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error publishing content: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to publish content")

# Analytics & Statistics

@router.get("/analytics/{content_id}")
async def get_content_analytics(
    content_id: str,
    days: int = Query(30, ge=1, le=365),
    admin: dict = Depends(require_permission(AdminPermission.VIEW_SYSTEM_STATS))
):
    """Get analytics for a specific content item"""
    
    try:
        analytics = await database.get_content_analytics(content_id, days)
        return {"analytics": analytics}
    except Exception as e:
        logger.error(f"Error getting content analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch content analytics")

@router.get("/statistics")
async def get_content_statistics(
    admin: dict = Depends(require_permission(AdminPermission.VIEW_SYSTEM_STATS))
):
    """Get overall content statistics"""
    
    try:
        stats = await database.get_content_statistics()
        return {"statistics": stats}
    except Exception as e:
        logger.error(f"Error getting content statistics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch content statistics")

# Templates

@router.get("/templates")
async def get_content_templates(
    content_type: Optional[ContentType] = None,
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_POLICIES))
):
    """Get content templates"""
    
    try:
        templates = await database.get_content_templates(content_type)
        return {"templates": templates}
    except Exception as e:
        logger.error(f"Error getting content templates: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch content templates")

@router.post("/templates")
async def create_content_template(
    template_data: ContentTemplate,
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_POLICIES))
):
    """Create a new content template"""
    
    try:
        template = ContentTemplate(
            **template_data.dict(exclude={"id", "created_at", "updated_at"}),
            created_by=admin["id"]
        )
        
        template_id = await database.create_content_template(template.dict())
        
        return {
            "message": "Content template created successfully",
            "template_id": template_id
        }
    except Exception as e:
        logger.error(f"Error creating content template: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create content template")

# Media Management

@router.post("/media/upload")
async def upload_media_file(
    file: UploadFile = File(...),
    folder: str = "general",
    alt_text: Optional[str] = None,
    caption: Optional[str] = None,
    tags: Optional[str] = None,
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_POLICIES))
):
    """Upload media file"""
    
    try:
        # Validate file type
        allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "application/pdf"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="File type not allowed")
        
        # Save file and create media record
        file_url = await database.save_uploaded_file(file, folder)
        
        media_file = MediaFile(
            filename=file.filename,
            original_filename=file.filename,
            file_type=file.content_type.split('/')[0],
            mime_type=file.content_type,
            file_size=file.size,
            file_url=file_url,
            alt_text=alt_text,
            caption=caption,
            tags=tags.split(',') if tags else [],
            folder=folder,
            uploaded_by=admin["id"]
        )
        
        media_id = await database.create_media_file(media_file.dict())
        
        return {
            "message": "Media file uploaded successfully",
            "media_id": media_id,
            "file_url": file_url
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading media file: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to upload media file")

@router.get("/media")
async def get_media_files(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    file_type: Optional[str] = None,
    folder: Optional[str] = None,
    admin: dict = Depends(require_permission(AdminPermission.MANAGE_POLICIES))
):
    """Get media files with pagination and filtering"""
    
    try:
        filters = {}
        if file_type:
            filters["file_type"] = file_type
        if folder:
            filters["folder"] = folder
        
        media_files = await database.get_media_files(filters, skip, limit)
        total_count = await database.get_media_files_count(filters)
        
        return {
            "media_files": media_files,
            "pagination": {
                "skip": skip,
                "limit": limit,
                "total": total_count
            }
        }
    except Exception as e:
        logger.error(f"Error getting media files: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch media files")

# Content Preview (Public endpoint for preview)

@router.get("/preview/{content_id}")
async def preview_content(content_id: str):
    """Preview content item (public endpoint for preview purposes)"""
    
    try:
        content_item = await database.get_content_item_by_id(content_id)
        if not content_item:
            raise HTTPException(status_code=404, detail="Content not found")
        
        # Only allow preview of published or scheduled content
        if content_item["status"] not in [ContentStatus.PUBLISHED.value, ContentStatus.SCHEDULED.value]:
            raise HTTPException(status_code=403, detail="Content not available for preview")
        
        return {"content": content_item}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error previewing content: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to preview content")