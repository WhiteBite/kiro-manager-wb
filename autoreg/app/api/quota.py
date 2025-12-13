"""
Quota API - Get usage quotas for accounts
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict, Any
import asyncio

from services.quota_service import QuotaService
from services.token_service import TokenService

router = APIRouter()
quota_service = QuotaService()
token_service = TokenService()


class UsageResponse(BaseModel):
    currentUsage: int
    usageLimit: int
    percentageUsed: float
    daysRemaining: Optional[int] = None
    resetDate: Optional[str] = None
    suspended: bool = False
    trialUsage: Optional[int] = None
    trialLimit: Optional[int] = None


class QuotaResponse(BaseModel):
    success: bool
    accountName: Optional[str] = None
    usage: Optional[UsageResponse] = None
    error: Optional[str] = None


@router.get("/current", response_model=QuotaResponse)
async def get_current_quota():
    """Get quota for current active account"""
    try:
        info = quota_service.get_current_quota()
        
        if not info:
            return QuotaResponse(success=False, error="No active account")
        
        if info.error:
            return QuotaResponse(success=False, error=info.error)
        
        usage = info.usage
        return QuotaResponse(
            success=True,
            accountName=info.account_name,
            usage=UsageResponse(
                currentUsage=usage.used if usage else 0,
                usageLimit=usage.limit if usage else 500,
                percentageUsed=usage.percent_used if usage else 0,
                daysRemaining=info.days_until_reset,
                resetDate=info.reset_date.isoformat() if info.reset_date else None,
                suspended=usage.suspended if usage else False,
                trialUsage=usage.trial_used if usage else None,
                trialLimit=usage.trial_limit if usage else None
            )
        )
    except Exception as e:
        return QuotaResponse(success=False, error=str(e))


@router.get("/{filename}", response_model=QuotaResponse)
async def get_account_quota(filename: str):
    """Get quota for specific account"""
    token = token_service.get_token(filename)
    if not token:
        raise HTTPException(status_code=404, detail="Account not found")
    
    try:
        access_token = token.raw_data.get('accessToken')
        
        # Refresh if expired
        if token.is_expired:
            new_data = token_service.refresh_token(token)
            access_token = new_data['accessToken']
        
        info = quota_service.get_quota(access_token, token.auth_method)
        
        if info.error:
            return QuotaResponse(success=False, accountName=token.account_name, error=info.error)
        
        usage = info.usage
        return QuotaResponse(
            success=True,
            accountName=token.account_name,
            usage=UsageResponse(
                currentUsage=usage.used if usage else 0,
                usageLimit=usage.limit if usage else 500,
                percentageUsed=usage.percent_used if usage else 0,
                daysRemaining=info.days_until_reset,
                resetDate=info.reset_date.isoformat() if info.reset_date else None,
                suspended=usage.suspended if usage else False
            )
        )
    except Exception as e:
        return QuotaResponse(success=False, accountName=token.account_name, error=str(e))


@router.get("/all/summary")
async def get_all_quotas():
    """Get quota summary for all accounts"""
    tokens = token_service.list_tokens()
    results = []
    
    for token in tokens:
        try:
            access_token = token.raw_data.get('accessToken')
            
            if token.is_expired:
                try:
                    new_data = token_service.refresh_token(token)
                    access_token = new_data['accessToken']
                except Exception:
                    results.append({
                        "accountName": token.account_name,
                        "error": "Token expired and refresh failed"
                    })
                    continue
            
            info = quota_service.get_quota(access_token, token.auth_method)
            
            if info.error:
                results.append({
                    "accountName": token.account_name,
                    "error": info.error
                })
            else:
                usage = info.usage
                results.append({
                    "accountName": token.account_name,
                    "currentUsage": usage.used if usage else 0,
                    "usageLimit": usage.limit if usage else 500,
                    "percentageUsed": usage.percent_used if usage else 0,
                    "daysRemaining": info.days_until_reset,
                    "suspended": usage.suspended if usage else False
                })
        except Exception as e:
            results.append({
                "accountName": token.account_name,
                "error": str(e)
            })
    
    return {"accounts": results, "total": len(results)}
