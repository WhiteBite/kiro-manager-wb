"""
IMAP Mail Handler для сбора кодов верификации
Поддерживает example.com с фильтрацией по To: заголовку
"""

import imaplib
import email
import re
import time
from typing import Optional

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.config import get_config

# Для обратной совместимости
def _get_imap_config():
    config = get_config()
    domain = config.registration.email_domain
    return {
        domain: {
            'host': config.imap.host,
            'email': config.imap.email,
            'password': config.imap.password,
        }
    }

IMAP_CONFIG = _get_imap_config()


class IMAPMailHandler:
    """Обработчик писем через IMAP"""
    
    def __init__(self, imap_host: str, imap_email: str, imap_password: str):
        """
        Args:
            imap_host: IMAP сервер (например, imap.yandex.ru)
            imap_email: Email для подключения (testmail@example.com)
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
            print(f"✓ Подключено к {self.imap_host}")
            return True
        except Exception as e:
            print(f"✗ Ошибка подключения: {e}")
            return False
    
    def disconnect(self):
        """Отключение от IMAP"""
        if self.imap:
            try:
                self.imap.close()
                self.imap.logout()
            except:
                pass
    
    def get_verification_code(self, target_email: str, timeout: int = 300) -> Optional[str]:
        """
        Получить код верификации из письма
        
        Args:
            target_email: Email адрес получателя (например, warp_tm42@example.com)
            timeout: Максимальное время ожидания в секундах
        
        Returns:
            Код верификации или None
        """
        import random
        
        start_time = time.time()
        checked_ids = set()  # Уже проверенные письма
        poll_count = 0
        
        print(f"📧 Жду письмо для {target_email}...")
        
        while time.time() - start_time < timeout:
            try:
                # Переподключаемся к INBOX (обновляет список писем)
                self.imap.select('INBOX')
                
                # Ищем письма ТОЛЬКО от AWS с кодом верификации
                # Используем IMAP SEARCH для фильтрации на сервере
                search_criteria = '(FROM "signin.aws" SUBJECT "Verify")'
                status, messages = self.imap.search(None, search_criteria)
                
                if status != 'OK' or not messages[0]:
                    # Fallback - ищем все от AWS
                    status, messages = self.imap.search(None, '(FROM "aws")')
                
                if status != 'OK' or not messages[0]:
                    poll_count += 1
                    wait_time = random.uniform(2.5, 4.5)  # Случайная задержка
                    if poll_count % 5 == 0:
                        print(f"   ⏳ Ожидание... ({int(time.time() - start_time)}s)")
                    time.sleep(wait_time)
                    continue
                
                # Берём только последние 10 писем от AWS
                email_ids = messages[0].split()[-10:]
                
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
                    
                    # Строгая проверка - письмо должно быть ТОЧНО для нашего email
                    if target_email.lower() not in msg_to:
                        continue
                    
                    # Проверяем что это от AWS signin
                    sender = header_msg.get('From', '').lower()
                    if 'signin.aws' not in sender and 'amazonaws' not in sender:
                        continue
                    
                    subject = header_msg.get('Subject', '')
                    print(f"   📩 Найдено письмо: {subject[:50]}...")
                    
                    # Теперь получаем полное письмо для извлечения кода
                    status, msg_data = self.imap.fetch(email_id, '(RFC822)')
                    if status != 'OK':
                        continue
                    
                    msg = email.message_from_bytes(msg_data[0][1])
                    
                    # Ищем код в теле письма
                    code = self._extract_code(msg)
                    
                    if code:
                        print(f"✓ Найден код верификации: {code}")
                        return code
                
                # Человекоподобная задержка между проверками
                poll_count += 1
                wait_time = random.uniform(2.0, 5.0)
                if poll_count % 3 == 0:
                    print(f"   ⏳ Проверка почты... ({int(time.time() - start_time)}s)")
                time.sleep(wait_time)
                
            except imaplib.IMAP4.abort as e:
                print(f"⚠ IMAP соединение прервано, переподключаюсь...")
                self.connect()
                time.sleep(2)
            except Exception as e:
                print(f"⚠ Ошибка при чтении писем: {e}")
                time.sleep(3)
        
        print(f"✗ Код верификации не найден за {timeout} секунд")
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


def get_mail_handler(email_domain: str) -> Optional[IMAPMailHandler]:
    """
    Получить обработчик почты для домена
    
    Args:
        email_domain: Домен email (например, example.com)
    
    Returns:
        IMAPMailHandler или None
    """
    config = IMAP_CONFIG.get(email_domain)
    
    if not config:
        print(f"⚠️ Нет конфига для домена: {email_domain}")
        return None
    
    handler = IMAPMailHandler(
        imap_host=config['host'],
        imap_email=config['email'],
        imap_password=config['password']
    )
    
    if handler.connect():
        return handler
    
    return None
