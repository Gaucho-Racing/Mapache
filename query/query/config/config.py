import os

class Config:
    """Configuration settings for the application"""
    
    # Server settings
    VERSION: str = "1.1.0"
    PORT: int = int(os.getenv('PORT', 7000))
    SERVICE_ENDPOINT: str = os.getenv('SERVICE_ENDPOINT')
    SERVICE_HEALTH_CHECK: str = os.getenv('SERVICE_HEALTH_CHECK')

    # Database settings
    DATABASE_HOST: str = os.getenv('DATABASE_HOST')
    DATABASE_PORT: int = int(os.getenv('DATABASE_PORT'))
    DATABASE_USER: str = os.getenv('DATABASE_USER')
    DATABASE_PASSWORD: str = os.getenv('DATABASE_PASSWORD')
    DATABASE_NAME: str = os.getenv('DATABASE_NAME')

    # Rincon settings
    RINCON_USER: str = os.getenv('RINCON_USER')
    RINCON_PASSWORD: str = os.getenv('RINCON_PASSWORD')
    RINCON_ENDPOINT: str = os.getenv('RINCON_ENDPOINT')

    # Auth settings
    SENTINEL_URL: str = os.getenv('SENTINEL_URL')
    SENTINEL_JWKS_URL: str = os.getenv('SENTINEL_JWKS_URL')
    SENTINEL_CLIENT_ID: str = os.getenv('SENTINEL_CLIENT_ID')

    @staticmethod
    def get_database_url() -> str:
        """Constructs the MySQL database URL from individual settings"""
        return f"mysql+aiomysql://{Config.DATABASE_USER}:{Config.DATABASE_PASSWORD}@{Config.DATABASE_HOST}:{Config.DATABASE_PORT}/{Config.DATABASE_NAME}"

