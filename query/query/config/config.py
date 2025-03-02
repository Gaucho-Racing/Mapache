import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Configuration settings for the application"""
    
    # Server settings
    VERSION: str = "1.0.0"
    PORT: int = int(os.getenv('PORT', 7000))

    # Database settings
    DATABASE_HOST: str = os.getenv('DATABASE_HOST', 'localhost')
    DATABASE_PORT: int = int(os.getenv('DATABASE_PORT', '3306'))
    DATABASE_USER: str = os.getenv('DATABASE_USER', 'root')
    DATABASE_PASSWORD: str = os.getenv('DATABASE_PASSWORD', 'password')
    DATABASE_NAME: str = os.getenv('DATABASE_NAME', 'mapache')

    @staticmethod
    def get_database_url() -> str:
        """Constructs the MySQL database URL from individual settings"""
        return f"mysql+pymysql://{Config.DATABASE_USER}:{Config.DATABASE_PASSWORD}@{Config.DATABASE_HOST}:{Config.DATABASE_PORT}/{Config.DATABASE_NAME}"

