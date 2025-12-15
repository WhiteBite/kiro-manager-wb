"""
Profile Storage - сохранение и загрузка профилей спуфинга

Профиль сохраняется вместе с токеном чтобы использовать
тот же fingerprint при работе с аккаунтом.
"""

import json
from pathlib import Path
from typing import Optional
from .profile import SpoofProfile


class ProfileStorage:
    """Хранилище профилей спуфинга"""
    
    def __init__(self, tokens_dir: Path):
        self.tokens_dir = Path(tokens_dir)
        self.profiles_dir = self.tokens_dir / '.profiles'
        self.profiles_dir.mkdir(parents=True, exist_ok=True)
    
    def _get_profile_path(self, email: str) -> Path:
        """Путь к файлу профиля для email"""
        safe_name = email.replace('@', '_at_').replace('.', '_')
        return self.profiles_dir / f"{safe_name}.json"
    
    def save(self, email: str, profile: SpoofProfile) -> bool:
        """Сохраняет профиль для аккаунта"""
        try:
            path = self._get_profile_path(email)
            data = profile.to_dict()
            path.write_text(json.dumps(data, indent=2), encoding='utf-8')
            return True
        except Exception as e:
            print(f"[ProfileStorage] Failed to save: {e}")
            return False
    
    def load(self, email: str) -> Optional[SpoofProfile]:
        """Загружает профиль для аккаунта"""
        try:
            path = self._get_profile_path(email)
            if not path.exists():
                return None
            data = json.loads(path.read_text(encoding='utf-8'))
            return SpoofProfile.from_dict(data)
        except Exception as e:
            print(f"[ProfileStorage] Failed to load: {e}")
            return None

    def exists(self, email: str) -> bool:
        """Проверяет есть ли сохранённый профиль"""
        return self._get_profile_path(email).exists()
    
    def delete(self, email: str) -> bool:
        """Удаляет профиль"""
        try:
            path = self._get_profile_path(email)
            if path.exists():
                path.unlink()
            return True
        except Exception:
            return False
    
    def get_or_create(self, email: str) -> SpoofProfile:
        """
        Загружает существующий профиль или создаёт новый.
        
        Это основной метод - гарантирует консистентность fingerprint.
        """
        profile = self.load(email)
        if profile:
            print(f"[ProfileStorage] Loaded existing profile for {email}")
            return profile
        
        # Создаём новый профиль
        from .profile import generate_random_profile
        profile = generate_random_profile()
        self.save(email, profile)
        print(f"[ProfileStorage] Created new profile for {email}")
        return profile
