"""
IMAP Mail Handler для сбора кодов верификации

Поддерживает разные стратегии email:
- single: письма приходят напрямую на IMAP email
- plus_alias: письма на user+tag@domain приходят в user@domain
- catch_all: письма на любой@domain приходят в один ящик (фильтр по To:)
- pool: каждый email = отдельный ящик (или общий с фильтром по To:)
"""

import imaplib
import email
import re
import time
import sys
import os
from typing import Optional
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


def safe_print(msg: str):
    """Print that works on Windows with cp1251 encoding"""
    try:
        print(msg)
    except UnicodeEncodeError:
        # Replace unicode symbols with ASCII equivalents
        replacements = {
            '✓': '[OK]', '✗': '[X]', '✅': '[OK]', '❌': '[X]',
            '⚠️': '[!]', '🔧': '[*]', '📧': '[M]', '📦': '[P]',
            '🔄': '[R]', '📌': '[V]', '🔐': '[K]', '👤': '[U]',
            '📝': '[N]', '🔍': '[S]', '🎫': '[T]', '🖥️': '[C]',
        }
        for old, new in replacements.items():
            msg = msg.replace(old, new)
        print(msg.encode('ascii', 'replace').decode('ascii'))

from core.config import get_config


def get_imap_settings() -> dict:
    """
    Get IMAP settings from environment (set by VS Code extension).
    Falls back to config file if env not set.
    """
    config = get_config()
    
    return {
        'host': os.environ.get('IMAP_SERVER', config.imap.host),
        'port': int(os.environ.get('IMAP_PORT', '993')),
        'user': os.environ.get('IMAP_USER', config.imap.email),
        'password': os.environ.get('IMAP_PASSWORD', config.imap.password),
        'strategy': os.environ.get('EMAIL_STRATEGY', 'single'),
    }


class IMAPMailHandler:
    """Обработчик писем через IMAP"""
    
    def __init__(self, imap_host: str, imap_email: str, imap_password: str):
        """
        Args:
            imap_host: IMAP сервер (например, imap.gmail.com)
            imap_email: Email для подключения (your@gmail.com)
            imap_password: Пароль
        """
        self.imap_host = imap_host
        self.imap_email = imap_email
        self.imap_password = imap_password
        self.imap = None
    
    def connect(self):
        """Подключение к IMAP"""
        try:
            self.imap = imaplib.IMAP4_SSL(self.imap_host)
            self.imap.login(self.imap_email, self.imap_password)
            print(f"[OK] Connected to {self.imap_host}")
            return True
        except Exception as e:
            print(f"[ERROR] IMAP connection failed: {e}")
            return False
    
    def disconnect(self):
        """Отключение от IMAP"""
        if self.imap:
            try:
                self.imap.close()
                self.imap.logout()
            except:
                pass
            self.imap = None
    
    def reconnect(self, new_email: str = None, new_password: str = None) -> bool:
        """
        Переподключение к IMAP с новыми credentials.
        Используется для pool стратегии где каждый email имеет свой пароль.
        
        Args:
            new_email: Новый email для логина (опционально)
            new_password: Новый пароль (опционально)
        """
        self.disconnect()
        
        if new_email:
            self.imap_email = new_email
        if new_password:
            self.imap_password = new_password
        
        return self.connect()
    
    def get_verification_code(self, target_email: str, timeout: int = 300) -> Optional[str]:
        """
        Получить код верификации из письма
        
        Args:
            target_email: Email адрес получателя (например, user+kiro123@gmail.com)
            timeout: Максимальное время ожидания в секундах
        
        Returns:
            Код верификации или None
        """
        import random
        
        start_time = time.time()
        checked_ids = set()  # Уже проверенные письма
        poll_count = 0
        
        # Нормализуем target email для сравнения
        target_lower = target_email.lower().strip()
        # Для plus alias: user+tag@domain -> ищем и user+tag@domain и user@domain
        target_base = target_lower.split('+')[0] + '@' + target_lower.split('@')[1] if '+' in target_lower else None
        
        safe_print(f"[MAIL] Waiting for email to {target_email}...")
        
        while time.time() - start_time < timeout:
            try:
                # Переподключаемся к INBOX (обновляет список писем)
                self.imap.select('INBOX')
                
                # Ищем письма СТРОГО по TO (точный поиск для catch-all)
                status, messages = self.imap.search(None, 'TO', target_email)
                
                if status != 'OK' or not messages[0]:
                    # Fallback: ищем по части email (без домена)
                    email_user = target_email.split('@')[0]
                    status, messages = self.imap.search(None, 'TO', email_user)
                
                if status != 'OK' or not messages[0]:
                    poll_count += 1
                    wait_time = random.uniform(2.0, 4.0)
                    if poll_count % 5 == 0:
                        safe_print(f"   No emails for {target_email}, waiting... ({int(time.time() - start_time)}s)")
                    time.sleep(wait_time)
                    continue
                
                email_ids = messages[0].split()
                
                # Debug: показываем сколько писем нашли
                new_ids = [eid for eid in email_ids if eid not in checked_ids]
                if new_ids and poll_count % 3 == 0:
                    safe_print(f"   Found {len(new_ids)} new emails to check ({int(time.time() - start_time)}s)")
                
                if not email_ids:
                    poll_count += 1
                    wait_time = random.uniform(2.0, 4.0)
                    if poll_count % 5 == 0:
                        safe_print(f"   No emails found, waiting... ({int(time.time() - start_time)}s)")
                    time.sleep(wait_time)
                    continue
                
                for email_id in reversed(email_ids):
                    # Пропускаем уже проверенные
                    if email_id in checked_ids:
                        continue
                    
                    checked_ids.add(email_id)
                    
                    # Сначала получаем только заголовки (быстрее)
                    status, header_data = self.imap.fetch(email_id, '(BODY[HEADER.FIELDS (TO FROM SUBJECT DATE)])')
                    if status != 'OK':
                        continue
                    
                    header_msg = email.message_from_bytes(header_data[0][1])
                    msg_to = header_msg.get('To', '').lower()
                    sender = header_msg.get('From', '').lower()
                    subject = header_msg.get('Subject', '')
                    
                    # Debug: показываем что проверяем
                    safe_print(f"   [D] Checking: from={sender[:35]}, to={msg_to[:35]}")
                    
                    # Проверяем отправителя (AWS) - СНАЧАЛА
                    is_aws = any(x in sender for x in ['signin.aws', 'amazonaws', 'aws.amazon', 'aws'])
                    if not is_aws:
                        continue
                    
                    # Проверка получателя
                    to_match = False
                    
                    # Вариант 1: точное совпадение email
                    if target_lower in msg_to:
                        to_match = True
                    # Вариант 2: target содержит +tag, ищем base в msg_to
                    elif target_base and target_base in msg_to:
                        to_match = True
                    
                    # Вариант 3: ОБРАТНЫЙ plus alias - target это base (user@domain),
                    # а письмо пришло на user+tag@domain
                    elif '+' in msg_to and '@' in msg_to:
                        # Извлекаем base из msg_to
                        try:
                            at_pos = msg_to.index('@')
                            user_part = msg_to[:at_pos]
                            domain_part = msg_to[at_pos:]
                            if '+' in user_part:
                                msg_to_base = user_part.split('+')[0] + domain_part
                                if target_lower == msg_to_base or target_lower in msg_to_base:
                                    to_match = True
                        except:
                            pass
                    
                    # НЕ используем fallback по домену - это берёт чужие письма!
                    
                    if not to_match:
                        safe_print(f"   [S] Skipping: to={msg_to[:50]} (looking for {target_lower})")
                        continue
                    
                    safe_print(f"   [OK] Found matching email: {subject[:50]}...")
                    
                    # Теперь получаем полное письмо для извлечения кода
                    status, msg_data = self.imap.fetch(email_id, '(RFC822)')
                    if status != 'OK':
                        continue
                    
                    msg = email.message_from_bytes(msg_data[0][1])
                    
                    # Ищем код в теле письма
                    code = self._extract_code(msg)
                    
                    if code:
                        safe_print(f"[OK] Verification code found: {code}")
                        return code
                
                # Задержка между проверками
                poll_count += 1
                wait_time = random.uniform(2.0, 4.0)
                if poll_count % 3 == 0:
                    safe_print(f"   Checking mail... ({int(time.time() - start_time)}s)")
                time.sleep(wait_time)
                
            except imaplib.IMAP4.abort as e:
                safe_print(f"[!] IMAP connection lost, reconnecting...")
                self.connect()
                time.sleep(2)
            except Exception as e:
                safe_print(f"[!] Error reading emails: {e}")
                time.sleep(3)
        
        safe_print(f"[X] Verification code not found in {timeout} seconds")
        return None
    
    def _extract_code(self, msg) -> Optional[str]:
        """Извлечение кода верификации из письма AWS"""
        
        # Получаем текст письма (и plain и html)
        body = ""
        html_body = ""
        
        if msg.is_multipart():
            for part in msg.walk():
                content_type = part.get_content_type()
                try:
                    payload = part.get_payload(decode=True)
                    if payload:
                        text = payload.decode('utf-8', errors='ignore')
                        if content_type == "text/plain":
                            body += text
                        elif content_type == "text/html":
                            html_body += text
                except:
                    pass
        else:
            try:
                body = msg.get_payload(decode=True).decode('utf-8', errors='ignore')
            except:
                body = str(msg.get_payload())
        
        # Если нет plain text, используем HTML
        if not body and html_body:
            # Убираем HTML теги
            body = re.sub(r'<[^>]+>', ' ', html_body)
            body = re.sub(r'\s+', ' ', body)
        
        # AWS Builder ID отправляет код в формате:
        # "Your verification code is: 123456" или просто 6-значное число
        
        # Паттерны для поиска кода (от более специфичных к общим)
        patterns = [
            r'verification code[:\s]+(\d{6})',
            r'Your code[:\s]+(\d{6})',
            r'code is[:\s]+(\d{6})',
            r'code[:\s]+(\d{6})',
            r'>(\d{6})<',  # Код в HTML теге
            r'\b(\d{6})\b',  # Любое 6-значное число
        ]
        
        for pattern in patterns:
            match = re.search(pattern, body, re.IGNORECASE)
            if match:
                code = match.group(1)
                # Валидация - код должен быть 6 цифр
                if len(code) == 6 and code.isdigit():
                    return code
        
        return None


def get_mail_handler(email_domain: str = None) -> Optional[IMAPMailHandler]:
    """
    Получить обработчик почты.
    
    Использует настройки из environment (установленные VS Code extension).
    Параметр email_domain оставлен для обратной совместимости, но игнорируется.
    
    Returns:
        IMAPMailHandler или None
    """
    settings = get_imap_settings()
    
    if not settings['host'] or not settings['user'] or not settings['password']:
        safe_print(f"[!] IMAP settings not configured")
        safe_print(f"    Please configure IMAP in extension settings")
        return None
    
    handler = IMAPMailHandler(
        imap_host=settings['host'],
        imap_email=settings['user'],
        imap_password=settings['password']
    )
    
    if handler.connect():
        return handler
    
    return None


def create_mail_handler_from_env() -> Optional[IMAPMailHandler]:
    """
    Create mail handler from environment variables.
    This is the preferred way to create handler when called from VS Code extension.
    """
    return get_mail_handler()
