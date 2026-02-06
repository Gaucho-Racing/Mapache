from typing import Optional, Dict, Any
import jwt
from jwt import PyJWKClient
from fastapi import HTTPException, status
from datetime import datetime
from loguru import logger
import requests

from query.service.rincon import RinconService

class AuthService:
    # Class variables for configuration
    jwks_url: str = None
    issuer: str = None
    audience: str = None
    jwks_client: PyJWKClient = None

    @classmethod
    def configure(cls, jwks_url: str, issuer: str, audience: str) -> None:
        """
        Configure the authentication service.
        
        Args:
            jwks_url: URL to fetch the JSON Web Key Set
            issuer: Expected issuer of the JWT token
            audience: Expected audience of the JWT token
        """
        if not jwks_url:
            raise ValueError("JWKS URL is required")
        if not issuer:
            raise ValueError("Issuer is required")
        if not audience:
            raise ValueError("Audience is required")

        cls.jwks_url = jwks_url
        cls.issuer = issuer
        cls.audience = audience

        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        }
        cls.jwks_client = PyJWKClient(jwks_url, headers=headers)
        logger.info(f"AuthService configured with JWKS URL: {jwks_url}")

    @classmethod
    def verify_token(cls, token: str) -> Dict[str, Any]:
        """
        Verify a JWT token using the JWKS endpoint.
        
        Args:
            token: The JWT token to verify
            
        Returns:
            Dict containing the decoded token claims
            
        Raises:
            HTTPException: If token verification fails
        """
        if not cls.jwks_client:
            raise Exception("AuthService not configured. Call configure() first.")

        try:
            # Decode the header first to get the kid
            header = jwt.get_unverified_header(token)
            kid = header.get('kid')
            
            if kid:
                logger.debug(f"Verifying token with kid: {kid}")
                signing_key = cls.jwks_client.get_signing_key_from_jwt(token).key
            else:
                logger.debug("No kid in token header, using first available key from JWKS")
                # Get all available keys
                keys = cls.jwks_client.get_signing_keys()
                if not keys:
                    raise Exception("No signing keys available from JWKS endpoint")
                signing_key = keys[0].key
            
            # Verify and decode the token
            decoded = jwt.decode(
                token,
                signing_key,
                algorithms=["RS256"],
                audience=cls.audience,
                issuer=cls.issuer,
                options={
                    "verify_aud": True,
                    "verify_iss": True,
                    "verify_exp": True,
                }
            )
            
            logger.debug("Token successfully verified")
            return decoded
            
        except jwt.ExpiredSignatureError:
            logger.warning("Token has expired")
            raise Exception("Token has expired")
        except jwt.InvalidTokenError as e:
            logger.error(f"Invalid token: {str(e)}")
            raise Exception(f"Invalid token: {str(e)}")
        except Exception as e:
            logger.error(f"Token verification failed: {str(e)}")
            raise Exception(f"Token verification failed: {str(e)}")

    @classmethod
    def get_user_id_from_token(cls, token: str) -> str:
        """
        Get the user ID from the token.
        """
        decoded = cls.verify_token(token)
        return decoded.get("sub")

    @classmethod
    def get_user_from_token(cls, token: str) -> str:
        """
        Get the user from the token.
        """
        route = "/users/@me"
        service = RinconService.match_route(route, "GET")
        r = requests.get(
            f"{service['endpoint']}{route}",
            headers={"Authorization": f"Bearer {token}"}
        )
        return r.json()