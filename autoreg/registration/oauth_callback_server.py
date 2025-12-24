"""
OAuth Callback Server

Локальный HTTP сервер для приёма OAuth callback от AWS/Google/Github.
Используется в WebView стратегии для получения authorization code.
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading
import time
from typing import Optional, Tuple, Callable
import logging

logger = logging.getLogger(__name__)


class OAuthCallbackHandler(BaseHTTPRequestHandler):
    """HTTP handler для OAuth callback"""
    
    def log_message(self, format, *args):
        """Отключаем стандартное логирование"""
        pass
    
    def do_GET(self):
        """Обработка GET запроса с OAuth callback"""
        try:
            parsed = urlparse(self.path)
            query = parse_qs(parsed.query)
            
            # Проверяем наличие code
            if 'code' in query:
                code = query['code'][0]
                state = query.get('state', [None])[0]
                
                # Сохраняем в сервер
                self.server.auth_code = code
                self.server.auth_state = state
                self.server.callback_received = True
                
                logger.info(f"[OAuth] Callback received: code={code[:20]}..., state={state[:20] if state else None}...")
                
                # Вызываем callback если есть
                if hasattr(self.server, 'on_callback') and self.server.on_callback:
                    try:
                        self.server.on_callback(code, state)
                    except Exception as e:
                        logger.error(f"[OAuth] Callback handler error: {e}")
                
                # Отправляем success page
                self.send_response(200)
                self.send_header('Content-type', 'text/html; charset=utf-8')
                self.end_headers()
                
                html = """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Authorization Successful</title>
                    <style>
                        body {
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            margin: 0;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        }
                        .container {
                            background: white;
                            padding: 40px;
                            border-radius: 10px;
                            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                            text-align: center;
                            max-width: 400px;
                        }
                        .success-icon {
                            font-size: 64px;
                            color: #4CAF50;
                            margin-bottom: 20px;
                        }
                        h1 {
                            color: #333;
                            margin: 0 0 10px 0;
                            font-size: 24px;
                        }
                        p {
                            color: #666;
                            margin: 0 0 20px 0;
                        }
                        .info {
                            background: #f5f5f5;
                            padding: 15px;
                            border-radius: 5px;
                            font-size: 14px;
                            color: #666;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="success-icon">✓</div>
                        <h1>Authorization Successful!</h1>
                        <p>You can close this window and return to the application.</p>
                        <div class="info">
                            The authorization code has been received.<br>
                            Token exchange is in progress...
                        </div>
                    </div>
                    <script>
                        // Auto-close after 3 seconds
                        setTimeout(function() {
                            window.close();
                        }, 3000);
                    </script>
                </body>
                </html>
                """
                
                self.wfile.write(html.encode('utf-8'))
                
            elif 'error' in query:
                # OAuth error
                error = query['error'][0]
                error_description = query.get('error_description', ['Unknown error'])[0]
                
                self.server.auth_error = error
                self.server.auth_error_description = error_description
                self.server.callback_received = True
                
                logger.error(f"[OAuth] Error callback: {error} - {error_description}")
                
                # Отправляем error page
                self.send_response(400)
                self.send_header('Content-type', 'text/html; charset=utf-8')
                self.end_headers()
                
                html = f"""
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Authorization Failed</title>
                    <style>
                        body {{
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            height: 100vh;
                            margin: 0;
                            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                        }}
                        .container {{
                            background: white;
                            padding: 40px;
                            border-radius: 10px;
                            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
                            text-align: center;
                            max-width: 400px;
                        }}
                        .error-icon {{
                            font-size: 64px;
                            color: #f44336;
                            margin-bottom: 20px;
                        }}
                        h1 {{
                            color: #333;
                            margin: 0 0 10px 0;
                            font-size: 24px;
                        }}
                        p {{
                            color: #666;
                            margin: 0 0 20px 0;
                        }}
                        .error-details {{
                            background: #ffebee;
                            padding: 15px;
                            border-radius: 5px;
                            font-size: 14px;
                            color: #c62828;
                            word-break: break-word;
                        }}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="error-icon">✗</div>
                        <h1>Authorization Failed</h1>
                        <p>An error occurred during authorization.</p>
                        <div class="error-details">
                            <strong>{error}</strong><br>
                            {error_description}
                        </div>
                    </div>
                </body>
                </html>
                """
                
                self.wfile.write(html.encode('utf-8'))
            else:
                # Неизвестный запрос
                self.send_response(400)
                self.send_header('Content-type', 'text/plain')
                self.end_headers()
                self.wfile.write(b'Invalid OAuth callback')
                
        except Exception as e:
            logger.error(f"[OAuth] Handler error: {e}")
            self.send_response(500)
            self.send_header('Content-type', 'text/plain')
            self.end_headers()
            self.wfile.write(f'Server error: {str(e)}'.encode('utf-8'))


class OAuthCallbackServer:
    """
    OAuth callback server
    
    Запускает локальный HTTP сервер для приёма OAuth callback.
    Используется в WebView стратегии.
    """
    
    def __init__(self, port: int = 43210, 
                 on_callback: Optional[Callable[[str, Optional[str]], None]] = None):
        """
        Args:
            port: Порт для сервера (по умолчанию 43210)
            on_callback: Callback функция, вызывается при получении code
                        Сигнатура: (code: str, state: Optional[str]) -> None
        """
        self.port = port
        self.on_callback = on_callback
        self.server: Optional[HTTPServer] = None
        self.thread: Optional[threading.Thread] = None
        
        # Результаты callback
        self.auth_code: Optional[str] = None
        self.auth_state: Optional[str] = None
        self.auth_error: Optional[str] = None
        self.auth_error_description: Optional[str] = None
        self.callback_received = False
    
    def start(self):
        """Запустить сервер в отдельном потоке"""
        if self.server:
            logger.warning("[OAuth] Server already running")
            return
        
        try:
            self.server = HTTPServer(('127.0.0.1', self.port), OAuthCallbackHandler)
            
            # Передаём callback в сервер
            self.server.auth_code = None
            self.server.auth_state = None
            self.server.auth_error = None
            self.server.auth_error_description = None
            self.server.callback_received = False
            self.server.on_callback = self.on_callback
            
            # Запускаем в отдельном потоке
            self.thread = threading.Thread(target=self._run, daemon=True)
            self.thread.start()
            
            logger.info(f"[OAuth] Callback server started on http://127.0.0.1:{self.port}")
            
        except OSError as e:
            if 'Address already in use' in str(e):
                raise RuntimeError(f"Port {self.port} already in use. Another OAuth server running?")
            raise
    
    def _run(self):
        """Запустить сервер (вызывается в отдельном потоке)"""
        try:
            # Обрабатываем только один запрос
            self.server.handle_request()
            
            # Копируем результаты из сервера
            self.auth_code = self.server.auth_code
            self.auth_state = self.server.auth_state
            self.auth_error = self.server.auth_error
            self.auth_error_description = self.server.auth_error_description
            self.callback_received = self.server.callback_received
            
        except Exception as e:
            logger.error(f"[OAuth] Server error: {e}")
    
    def wait_for_callback(self, timeout: int = 300) -> Tuple[Optional[str], Optional[str]]:
        """
        Ждать OAuth callback
        
        Args:
            timeout: Таймаут в секундах (по умолчанию 5 минут)
            
        Returns:
            Tuple (code, state) или (None, None) при ошибке/таймауте
        """
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            if self.callback_received:
                if self.auth_code:
                    logger.info(f"[OAuth] Callback received successfully")
                    return self.auth_code, self.auth_state
                elif self.auth_error:
                    logger.error(f"[OAuth] Error: {self.auth_error} - {self.auth_error_description}")
                    return None, None
            
            time.sleep(0.5)
        
        logger.error(f"[OAuth] Callback timeout after {timeout}s")
        return None, None
    
    def stop(self):
        """Остановить сервер"""
        if self.server:
            try:
                self.server.shutdown()
                self.server.server_close()
            except Exception as e:
                logger.error(f"[OAuth] Error stopping server: {e}")
            finally:
                self.server = None
        
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=2)
            self.thread = None
        
        logger.info("[OAuth] Callback server stopped")
    
    def get_redirect_uri(self) -> str:
        """Получить redirect URI для OAuth"""
        return f"http://127.0.0.1:{self.port}/oauth/callback"
    
    def __enter__(self):
        self.start()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.stop()
