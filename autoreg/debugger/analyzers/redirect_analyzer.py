"""
Redirect Analyzer - анализ проблем с редиректами AWS

Специально для диагностики проблемы когда:
- workflow-step-id = end-of-workflow-success
- Но страница не редиректит на awsapps.com
"""

from typing import Dict, List, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from ..core import DebugSession


class RedirectAnalyzer:
    """
    Анализирует проблемы с редиректами после успешной регистрации.
    
    Известные проблемы:
    1. Shortbread script (cookie consent) блокирует редирект
    2. FWCIM fingerprint не проходит проверку
    3. JavaScript ошибки блокируют выполнение
    4. CSP блокирует скрипты
    """
    
    def __init__(self, session: 'DebugSession'):
        self.session = session
    
    def analyze(self) -> Dict:
        """Полный анализ проблем с редиректом"""
        result = {
            'workflow_success': False,
            'redirect_completed': False,
            'shortbread_issues': [],
            'js_errors': [],
            'blocked_requests': [],
            'redirect_attempts': [],
            'recommendations': []
        }
        
        # Проверяем workflow success
        for collector in self.session._collectors:
            if hasattr(collector, 'is_workflow_success'):
                result['workflow_success'] = collector.is_workflow_success()
                break
        
        # Проверяем финальный URL
        final_url = self.session.page.url if self.session.page else ''
        result['final_url'] = final_url
        result['redirect_completed'] = (
            'awsapps.com' in final_url or 
            '127.0.0.1' in final_url or
            'callback' in final_url
        )
        
        # Анализируем Shortbread
        result['shortbread_issues'] = self._analyze_shortbread()
        
        # Анализируем JS ошибки
        result['js_errors'] = self._analyze_js_errors()
        
        # Анализируем заблокированные запросы
        result['blocked_requests'] = self._analyze_blocked_requests()
        
        # Анализируем попытки редиректа
        result['redirect_attempts'] = self._analyze_redirect_attempts()
        
        # Генерируем рекомендации
        result['recommendations'] = self._generate_recommendations(result)
        
        return result
    
    def _analyze_shortbread(self) -> List[Dict]:
        """Анализирует проблемы с Shortbread (AWS cookie consent)"""
        issues = []
        
        # Ищем в JS ошибках
        for collector in self.session._collectors:
            if hasattr(collector, 'get_js_errors'):
                for err in collector.get_js_errors():
                    msg = err.get('message', '').lower()
                    if 'shortbread' in msg:
                        issues.append({
                            'type': 'js_error',
                            'message': err.get('message'),
                            'timestamp': err.get('timestamp')
                        })
        
        # Ищем в console
        for collector in self.session._collectors:
            if hasattr(collector, 'get_console_messages'):
                for msg in collector.get_console_messages():
                    args = ' '.join(msg.get('args', [])).lower()
                    if 'shortbread' in args:
                        issues.append({
                            'type': 'console',
                            'level': msg.get('level'),
                            'message': ' '.join(msg.get('args', [])),
                            'timestamp': msg.get('timestamp')
                        })
        
        # Ищем в запросах
        for req in self.session.all_requests:
            url = req.get('url', '') or req.get('name', '')
            if 'shortbread' in url.lower():
                status = req.get('status', 0)
                if status == 0 or status >= 400:
                    issues.append({
                        'type': 'failed_request',
                        'url': url,
                        'status': status,
                        'error': req.get('error')
                    })
        
        return issues
    
    def _analyze_js_errors(self) -> List[Dict]:
        """Анализирует критические JS ошибки"""
        errors = []
        
        for collector in self.session._collectors:
            if hasattr(collector, 'get_js_errors'):
                for err in collector.get_js_errors():
                    # Фильтруем важные ошибки
                    msg = err.get('message', '')
                    if any(x in msg.lower() for x in ['redirect', 'navigation', 'location', 'href', 'shortbread', 'fwcim']):
                        errors.append(err)
        
        return errors
    
    def _analyze_blocked_requests(self) -> List[Dict]:
        """Анализирует заблокированные запросы"""
        blocked = []
        
        for req in self.session.all_requests:
            status = req.get('status', 0)
            error = req.get('error', '')
            
            if status == 0 or error:
                url = req.get('url', '') or req.get('name', '')
                # Фильтруем важные
                if any(x in url.lower() for x in ['signin', 'oauth', 'token', 'redirect', 'callback', 'fwcim', 'shortbread']):
                    blocked.append({
                        'url': url,
                        'status': status,
                        'error': error
                    })
        
        return blocked
    
    def _analyze_redirect_attempts(self) -> List[Dict]:
        """Анализирует попытки редиректа"""
        attempts = []
        
        # Из URL history
        for ts, url in self.session.url_history:
            if 'redirect' in url.lower() or 'callback' in url.lower():
                attempts.append({
                    'timestamp': ts,
                    'url': url,
                    'type': 'navigation'
                })
        
        # Из запросов с 3xx статусом
        for req in self.session.all_requests:
            status = req.get('status', 0)
            if 300 <= status < 400:
                attempts.append({
                    'timestamp': req.get('timestamp'),
                    'url': req.get('url', ''),
                    'status': status,
                    'type': 'http_redirect'
                })
        
        return attempts
    
    def _generate_recommendations(self, analysis: Dict) -> List[str]:
        """Генерирует рекомендации на основе анализа"""
        recs = []
        
        if analysis['workflow_success'] and not analysis['redirect_completed']:
            recs.append("⚠️ Workflow успешен, но редирект не завершился")
            
            if analysis['shortbread_issues']:
                recs.append("🍪 Shortbread script имеет проблемы - возможно блокирует редирект")
                recs.append("   Попробуйте: добавить Shortbread домены в whitelist или отключить cookie consent")
            
            if analysis['js_errors']:
                recs.append("❌ Есть JS ошибки которые могут блокировать редирект")
                for err in analysis['js_errors'][:3]:
                    recs.append(f"   - {err.get('message', '')[:60]}")
            
            if analysis['blocked_requests']:
                recs.append("🚫 Есть заблокированные запросы")
                for req in analysis['blocked_requests'][:3]:
                    recs.append(f"   - {req.get('url', '')[:50]}")
            
            recs.append("")
            recs.append("💡 Возможные решения:")
            recs.append("   1. Принудительный редирект когда workflow-step-id = success")
            recs.append("   2. Отключить Shortbread через CDP")
            recs.append("   3. Проверить CSP headers")
        
        elif not analysis['workflow_success']:
            recs.append("❌ Workflow не завершился успешно")
            recs.append("   Проверьте предыдущие шаги регистрации")
        
        else:
            recs.append("✅ Редирект завершился успешно!")
        
        return recs
    
    def print_report(self):
        """Выводит отчёт в консоль"""
        analysis = self.analyze()
        
        print("\n" + "="*60)
        print("REDIRECT ANALYSIS REPORT")
        print("="*60)
        
        print(f"\nWorkflow Success: {'✅' if analysis['workflow_success'] else '❌'}")
        print(f"Redirect Completed: {'✅' if analysis['redirect_completed'] else '❌'}")
        print(f"Final URL: {analysis['final_url'][:60]}...")
        
        if analysis['shortbread_issues']:
            print(f"\n🍪 Shortbread Issues ({len(analysis['shortbread_issues'])}):")
            for issue in analysis['shortbread_issues'][:5]:
                print(f"   [{issue['type']}] {str(issue.get('message', ''))[:50]}")
        
        if analysis['js_errors']:
            print(f"\n❌ JS Errors ({len(analysis['js_errors'])}):")
            for err in analysis['js_errors'][:5]:
                print(f"   {err.get('message', '')[:60]}")
        
        if analysis['blocked_requests']:
            print(f"\n🚫 Blocked Requests ({len(analysis['blocked_requests'])}):")
            for req in analysis['blocked_requests'][:5]:
                print(f"   {req.get('url', '')[:50]} -> {req.get('status', 'error')}")
        
        print("\n" + "-"*60)
        print("RECOMMENDATIONS:")
        for rec in analysis['recommendations']:
            print(rec)
        
        print("="*60 + "\n")
        
        return analysis
