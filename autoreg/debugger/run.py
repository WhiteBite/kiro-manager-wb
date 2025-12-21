#!/usr/bin/env python3
"""
Запуск полной отладки регистрации AWS Builder ID

Использование:
    python -m debugger.run
    
    # или из autoreg/
    python debugger/run.py
"""

import os
import sys
import time

# Добавляем путь к autoreg
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from debugger import DebugSession


def run_debug_registration():
    """Запускает полную отладку регистрации"""
    
    # Создаём сессию
    session = DebugSession()
    
    # Импортируем модули регистрации
    from registration.register import AWSRegistration
    from registration.browser import BrowserAutomation
    from registration.oauth_pkce import OAuthPKCE
    from core.email_generator import EmailGenerator
    
    reg = AWSRegistration(headless=False)
    
    try:
        # === INIT ===
        session.start_step("init")
        
        generator = EmailGenerator.from_env()
        email_result = generator.generate()
        session.note(f"Email: {email_result.registration_email}")
        session.note(f"Name: {email_result.display_name}")
        
        reg._init_mail()
        session.note("IMAP connected")
        
        session.end_step()
        
        # === OAUTH ===
        session.start_step("oauth_start")
        
        reg.oauth = OAuthPKCE()
        auth_url = reg.oauth.start(account_name=email_result.registration_email.split('@')[0])
        session.note(f"Auth URL: {auth_url[:60]}...")
        session.note(f"Callback port: {reg.oauth.port}")
        
        session.end_step()
        
        # === BROWSER ===
        session.start_step("browser_init")
        
        reg.browser = BrowserAutomation(headless=False, email=email_result.registration_email)
        
        # Подключаем дебаггер к браузеру
        session.attach(reg.browser.page)
        
        # Пропускаем prewarm для ускорения дебага
        # reg.browser.prewarm()
        session.note("Browser ready (prewarm skipped for debug)")
        
        session.end_step()
        
        # === NAVIGATE ===
        session.start_step("navigate")
        
        reg.browser.navigate(auth_url)
        session.collect()
        session.monitor(duration=5)
        
        session.end_step()
        
        # === EMAIL ===
        session.start_step("email_input")
        
        reg.browser.enter_email(email_result.registration_email)
        session.collect()
        
        reg.browser.click_continue()
        session.note("Clicked Continue")
        
        session.monitor(duration=10)
        
        session.end_step()
        
        # === NAME ===
        session.start_step("name_input")
        
        reg.browser.enter_name(email_result.display_name)
        session.collect()
        session.monitor(duration=5)
        
        session.end_step()
        
        # === VERIFICATION CODE ===
        session.start_step("verification_code")
        
        session.note("Waiting for email...")
        code = reg.mail_handler.get_verification_code(email_result.imap_lookup_email, timeout=90)
        
        if not code:
            session.end_step("No verification code received")
            raise Exception("No verification code")
        
        session.note(f"Code received: {code}")
        reg.browser.enter_verification_code(code)
        session.collect()
        session.monitor(duration=10)
        
        session.end_step()
        
        # === PASSWORD ===
        session.start_step("password_input")
        
        password = reg.browser.generate_password()
        session.note(f"Password: {password}")
        
        pwd_fields = reg.browser.page.eles('tag:input@@type=password', timeout=3)
        session.note(f"Found {len(pwd_fields)} password fields")
        
        if len(pwd_fields) >= 2:
            reg.browser.human_type(pwd_fields[0], password, field_type='password')
            session.note("First password entered")
            time.sleep(0.5)
            reg.browser.human_type(pwd_fields[1], password, field_type='password')
            session.note("Second password entered")
        
        session.collect()
        session.end_step()
        
        # === PASSWORD SUBMIT - КРИТИЧЕСКИЙ МОМЕНТ ===
        session.start_step("password_submit")
        
        reg.browser._click_if_exists(['@data-testid=test-primary-button'], timeout=1)
        session.note("Clicked Continue")
        
        # Мониторим долго - это где происходит зависание
        session.note("Monitoring redirect (up to 120s)...")
        
        workflow_success_detected = False
        
        def check_success():
            """Проверяет условия успеха"""
            nonlocal workflow_success_detected
            
            # Собираем данные
            session.collect()
            
            # Проверяем cookies
            for collector in session._collectors:
                if hasattr(collector, 'is_workflow_success') and collector.is_workflow_success():
                    if not workflow_success_detected:
                        session.note("🎉 WORKFLOW SUCCESS via cookie!")
                        workflow_success_detected = True
                    break
            
            # Проверяем URL
            url = session.page.url if session.page else ""
            if 'awsapps.com' in url:
                session.note(f"Reached awsapps.com")
                return True
            if '127.0.0.1' in url and 'callback' in url:
                session.note(f"Reached callback")
                return True
            
            return False
        
        success = session.monitor(duration=120, interval=1, stop_condition=check_success)
        
        # Если workflow success но редирект не произошёл - пробуем форсировать
        if workflow_success_detected and not success:
            session.note("⚠️ Workflow success but no redirect - trying to force...")
            
            # Пробуем получить redirect URL из страницы
            try:
                redirect_info = session.page.run_js('''
                    // Ищем redirect URL в странице
                    const scripts = document.querySelectorAll('script');
                    for (const s of scripts) {
                        const text = s.textContent || '';
                        const match = text.match(/redirect[Uu]rl["']?\s*[:=]\s*["']([^"']+)/);
                        if (match) return {found: true, url: match[1]};
                    }
                    
                    // Ищем в meta refresh
                    const meta = document.querySelector('meta[http-equiv="refresh"]');
                    if (meta) {
                        const content = meta.getAttribute('content') || '';
                        const match = content.match(/url=(.+)/i);
                        if (match) return {found: true, url: match[1]};
                    }
                    
                    // Ищем ссылки на awsapps
                    const links = document.querySelectorAll('a[href*="awsapps"]');
                    if (links.length) return {found: true, url: links[0].href};
                    
                    return {found: false};
                ''')
                
                if redirect_info and redirect_info.get('found'):
                    session.note(f"Found redirect URL: {redirect_info.get('url', '')[:50]}...")
                else:
                    session.note("No redirect URL found in page")
                    
            except Exception as e:
                session.note(f"Error searching for redirect: {e}")
        
        if not success:
            session.note("Timeout waiting for redirect")
        
        session.end_step()
        
        # === ALLOW ACCESS ===
        session.start_step("allow_access")
        
        current_url = session.page.url if session.page else ""
        if 'awsapps.com' in current_url:
            session.note("On awsapps.com, clicking Allow access...")
            reg.browser.click_allow_access()
            session.monitor(duration=10)
        else:
            session.note(f"Not on awsapps.com, current URL: {current_url[:50]}...")
        
        session.end_step()
        
        # === OAUTH CALLBACK ===
        session.start_step("oauth_callback")
        
        success = reg.oauth.wait_for_callback(timeout=30)
        if success:
            session.note(f"Token: {reg.oauth.get_token_filename()}")
        else:
            session.note("Callback timeout")
        
        session.end_step()
        
    except Exception as e:
        import traceback
        session.note(f"EXCEPTION: {e}")
        session.note(traceback.format_exc())
        if session.current_step:
            session.end_step(str(e))
    
    finally:
        # Анализируем проблемы с редиректом
        from debugger.analyzers import RedirectAnalyzer
        redirect_analysis = RedirectAnalyzer(session).print_report()
        
        # Сохраняем отчёт
        report_path = session.save()
        
        # Экспортируем HAR
        from debugger.exporters import HARExporter
        har_path = HARExporter(session).export()
        
        reg.close()
        
        print(f"\n{'='*60}")
        print(f"DEBUG COMPLETE")
        print(f"Report: {report_path}")
        print(f"HAR: {har_path}")
        print(f"HTML: {session.session_dir / 'report.html'}")
        print(f"{'='*60}")


if __name__ == '__main__':
    run_debug_registration()
