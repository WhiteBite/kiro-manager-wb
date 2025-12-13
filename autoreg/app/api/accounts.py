"""
Accounts API - List, switch, delete accounts
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from services.token_service import TokenService
from services.kiro_service import KiroService

router = APIRouter()
token_service = TokenService()
kiro_service = KiroService()


class AccountResponse(BaseModel):
    filename: str
    accountName: str
    email: Optional[str] = None
    provider: str
    authMethod: str
    region: str
    isActive: bool
    isExpired: bool
    expiresAt: Optional[str] = None
    expiresIn: Optional[str] = None


class AccountListResponse(BaseModel):
    accounts: List[AccountResponse]
    total: int
    valid: int
    expired: int
    activeAccount: Optional[str] = None


@router.get("", response_model=AccountListResponse)
async def list_accounts():
    """Get all accounts"""
    tokens = token_service.list_tokens()
    current = token_service.get_current_token()
    current_refresh = current.raw_data.get('refreshToken') if current else None
    
    accounts = []
    valid_count = 0
    expired_count = 0
    active_account = None
    
    for token in tokens:
        is_active = (current_refresh and 
                    token.raw_data.get('refreshToken') == current_refresh)
        
        if is_active:
            active_account = token.account_name
        
        if token.is_expired:
            expired_count += 1
        else:
            valid_count += 1
        
        # Calculate expires in
        expires_in = None
        if token.expires_at:
            try:
                # Handle timezone-aware and naive datetimes
                now = datetime.now(token.expires_at.tzinfo) if token.expires_at.tzinfo else datetime.now()
                delta = token.expires_at - now
                if delta.total_seconds() > 0:
                    hours = int(delta.total_seconds() // 3600)
                    if hours < 24:
                        expires_in = f"{hours}h"
                    else:
                        expires_in = f"{hours // 24}d"
                else:
                    expires_in = "expired"
            except Exception:
                expires_in = "—"
        
        accounts.append(AccountResponse(
            filename=token.path.name,
            accountName=token.account_name,
            email=token.raw_data.get('email') if token.raw_data else None,
            provider=token.provider,
            authMethod=token.auth_method,
            region=token.region,
            isActive=is_active,
            isExpired=token.is_expired,
            expiresAt=token.expires_at.isoformat() if token.expires_at else None,
            expiresIn=expires_in
        ))
    
    return AccountListResponse(
        accounts=accounts,
        total=len(accounts),
        valid=valid_count,
        expired=expired_count,
        activeAccount=active_account
    )


@router.post("/{filename}/switch")
async def switch_account(filename: str):
    """Switch to a specific account"""
    token = token_service.get_token(filename)
    if not token:
        raise HTTPException(status_code=404, detail="Account not found")
    
    success = token_service.activate_token(token)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to switch account")
    
    return {"success": True, "message": f"Switched to {token.account_name}"}


@router.delete("/{filename}")
async def delete_account(filename: str):
    """Delete an account"""
    token = token_service.get_token(filename)
    if not token:
        raise HTTPException(status_code=404, detail="Account not found")
    
    try:
        token_service.delete_token(filename)
        return {"success": True, "message": "Account deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{filename}/refresh")
async def refresh_account(filename: str):
    """Refresh account token"""
    token = token_service.get_token(filename)
    if not token:
        raise HTTPException(status_code=404, detail="Account not found")
    
    try:
        updated = token_service.refresh_and_save(token)
        return {
            "success": True,
            "expiresAt": updated.expires_at.isoformat() if updated.expires_at else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/expired/all")
async def delete_expired():
    """Delete all expired accounts"""
    tokens = token_service.list_tokens()
    deleted = 0
    
    for token in tokens:
        if token.is_expired:
            try:
                token_service.delete_token(token.path.name)
                deleted += 1
            except Exception:
                pass
    
    return {"success": True, "deleted": deleted}


@router.get("/current")
async def get_current():
    """Get current active account"""
    token = token_service.get_current_token()
    if not token:
        return {"active": False}
    
    return {
        "active": True,
        "accountName": token.account_name,
        "email": token.raw_data.get('email'),
        "provider": token.provider,
        "isExpired": token.is_expired
    }
