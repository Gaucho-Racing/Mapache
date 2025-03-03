import os

class Config:
    """Configuration settings for the application"""
    
    # Server settings
    VERSION: str = "1.0.0"
    PORT: int = int(os.getenv('PORT', 7000))

    # Database settings
    DATABASE_HOST: str = os.getenv('DATABASE_HOST')
    DATABASE_PORT: int = int(os.getenv('DATABASE_PORT'))
    DATABASE_USER: str = os.getenv('DATABASE_USER')
    DATABASE_PASSWORD: str = os.getenv('DATABASE_PASSWORD')
    DATABASE_NAME: str = os.getenv('DATABASE_NAME')

    @staticmethod
    def get_database_url() -> str:
        """Constructs the MySQL database URL from individual settings"""
        return f"mysql+pymysql://{Config.DATABASE_USER}:{Config.DATABASE_PASSWORD}@{Config.DATABASE_HOST}:{Config.DATABASE_PORT}/{Config.DATABASE_NAME}"

