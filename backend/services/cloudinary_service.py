import cloudinary
import cloudinary.uploader
from config import settings
import logging

logger = logging.getLogger(__name__)

class CloudinaryService:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(CloudinaryService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
            
        try:
            cloudinary.config(
                cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                api_key=settings.CLOUDINARY_API_KEY,
                api_secret=settings.CLOUDINARY_API_SECRET
            )
            self._initialized = True
            logger.info("Cloudinary initialized successfully")
        except Exception as e:
            logger.error(f"Cloudinary init error: {str(e)}")
            self._initialized = False
    
    async def upload_image(self, file_content, folder="luit"):
        """Upload image to Cloudinary"""
        try:
            result = cloudinary.uploader.upload(
                file_content,
                folder=folder,
                resource_type="auto"
            )
            return result['secure_url']
        except Exception as e:
            logger.error(f"Cloudinary upload error: {str(e)}")
            raise

cloudinary_service = CloudinaryService()
