"""
HTML Exporter - красивый HTML отчёт
"""

import json
from pathlib import Path
from typing import TYPE_CHECKING
from dataclasses import asdict

if TYPE_CHECKING:
    from ..core import DebugSession


class HTMLExporter:
    """
    Создаёт красивый HTML отчёт для просмотра в браузере.
    """
    
    def __init__(self, session: 'DebugSession'):
        self.session = session
    
    def export(self) -> Path:
        """Экспортирует в HTML"""
        output_path = self.session.session_dir / 'report.html'
        
        html = self._generate_html()
        output_path.write_text(html, encoding='utf-8')
        
        return output_path
    
    def _generate_html(self) -> str:
        """Генерирует HTML"""
        
        # Подготавливаем данные
        steps_json = json.dumps([asdict(s) for s in self.session.steps], default=str)
        requests_json = json.dumps(self.session.all_requests[-200:], default=str)
        url_history_json = json.dumps(self.session.url_history, default=str)
        
        return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Debug Report: {self.session.session_id}</title>
    <style>
        * {{ box-sizing: border-box; margin: 0; padding: 0; }}
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #1a1a2e; 
            color: #eee;
            line-height: 1.6;
        }}
        .container {{ max-width: 1400px; margin: 0 auto; padding: 20px; }}
        
        h1 {{ color: #00d9ff; margin-bottom: 10px; }}
        h2 {{ color: #ff6b6b; margin: 20px 0 10px; border-bottom: 1px solid #333; padding-bottom: 5px; }}
        h3 {{ color: #ffd93d; margin: 15px 0 8px; }}
        
        .summary {{ 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }}
        .summary-card {{
            background: #16213e;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #00d9ff;
        }}
        .summary-card .value {{ font-size: 24px; font-weight: bold; color: #00d9ff; }}
        .summary-card .label {{ color: #888; font-size: 12px; text-transform: uppercase; }}
        
        .step {{
            background: #16213e;
            margin: 10px 0;
            border-radius: 8px;
            overflow: hidden;
        }}
        .step-header {{
            background: #0f3460;
            padding: 12px 15px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .step-header:hover {{ background: #1a4a7a; }}
        .step-name {{ font-weight: bold; }}
        .step-duration {{ color: #ffd93d; }}
        .step-error {{ color: #ff6b6b; }}
        .step-content {{ padding: 15px; display: none; }}
        .step.open .step-content {{ display: block; }}
        
        .request {{
            background: #0f0f23;
            margin: 5px 0;
            padding: 10px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
        }}
        .request .method {{ color: #ffd93d; font-weight: bold; }}
        .request .url {{ color: #00d9ff; word-break: break-all; }}
        .request .status {{ padding: 2px 6px; border-radius: 3px; }}
        .request .status.ok {{ background: #2d5a27; color: #7fff7f; }}
        .request .status.error {{ background: #5a2727; color: #ff7f7f; }}
        .request .duration {{ color: #888; }}
        
        .cookie {{
            display: inline-block;
            background: #2d2d5a;
            padding: 3px 8px;
            margin: 2px;
            border-radius: 3px;
            font-size: 11px;
        }}
        .cookie.important {{ background: #5a2d5a; border: 1px solid #ff6b6b; }}
        
        .url-history {{
            font-family: monospace;
            font-size: 12px;
        }}
        .url-history .time {{ color: #888; width: 80px; display: inline-block; }}
        .url-history .url {{ color: #00d9ff; word-break: break-all; }}
        
        .tabs {{ display: flex; gap: 5px; margin-bottom: 15px; }}
        .tab {{
            padding: 8px 16px;
            background: #16213e;
            border: none;
            color: #888;
            cursor: pointer;
            border-radius: 4px 4px 0 0;
        }}
        .tab.active {{ background: #0f3460; color: #fff; }}
        .tab-content {{ display: none; }}
        .tab-content.active {{ display: block; }}
        
        pre {{
            background: #0f0f23;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
            font-size: 11px;
        }}
        
        .note {{ color: #ffd93d; font-style: italic; margin: 5px 0; }}
        
        .filter-input {{
            width: 100%;
            padding: 8px;
            background: #0f0f23;
            border: 1px solid #333;
            color: #fff;
            border-radius: 4px;
            margin-bottom: 10px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 Debug Report</h1>
        <p style="color: #888;">Session: {self.session.session_id}</p>
        
        <div class="summary">
            <div class="summary-card">
                <div class="value">{self.session._elapsed():.1f}s</div>
                <div class="label">Total Duration</div>
            </div>
            <div class="summary-card">
                <div class="value">{len(self.session.steps)}</div>
                <div class="label">Steps</div>
            </div>
            <div class="summary-card">
                <div class="value">{len(self.session.all_requests)}</div>
                <div class="label">Requests</div>
            </div>
            <div class="summary-card">
                <div class="value">{len(self.session.url_history)}</div>
                <div class="label">URL Changes</div>
            </div>
        </div>
        
        <div class="tabs">
            <button class="tab active" onclick="showTab('steps')">Steps</button>
            <button class="tab" onclick="showTab('requests')">Requests</button>
            <button class="tab" onclick="showTab('urls')">URL History</button>
            <button class="tab" onclick="showTab('raw')">Raw JSON</button>
        </div>
        
        <div id="steps" class="tab-content active">
            <h2>📋 Steps</h2>
            <div id="steps-container"></div>
        </div>
        
        <div id="requests" class="tab-content">
            <h2>🌐 Network Requests</h2>
            <input type="text" class="filter-input" placeholder="Filter requests..." oninput="filterRequests(this.value)">
            <div id="requests-container"></div>
        </div>
        
        <div id="urls" class="tab-content">
            <h2>🔗 URL History</h2>
            <div id="urls-container" class="url-history"></div>
        </div>
        
        <div id="raw" class="tab-content">
            <h2>📄 Raw Data</h2>
            <h3>Steps</h3>
            <pre id="raw-steps"></pre>
            <h3>Requests (last 50)</h3>
            <pre id="raw-requests"></pre>
        </div>
    </div>
    
    <script>
        const steps = {steps_json};
        const requests = {requests_json};
        const urlHistory = {url_history_json};
        const importantCookies = ['workflow-step-id', 'directory-csrf-token', 'login-interview-token'];
        
        function showTab(tabId) {{
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.querySelector(`[onclick="showTab('${{tabId}}')"]`).classList.add('active');
            document.getElementById(tabId).classList.add('active');
        }}
        
        function renderSteps() {{
            const container = document.getElementById('steps-container');
            container.innerHTML = steps.map((step, i) => `
                <div class="step" onclick="this.classList.toggle('open')">
                    <div class="step-header">
                        <span class="step-name">${{step.name}}</span>
                        <span>
                            <span class="step-duration">${{step.duration.toFixed(1)}}s</span>
                            ${{step.error ? `<span class="step-error">❌ ${{step.error}}</span>` : ''}}
                        </span>
                    </div>
                    <div class="step-content">
                        <p><strong>URL:</strong> ${{step.url_before.substring(0, 60)}}... → ${{step.url_after.substring(0, 60)}}...</p>
                        <p><strong>Requests:</strong> ${{step.requests.length}}</p>
                        
                        ${{step.notes.length ? `
                            <h3>Notes</h3>
                            ${{step.notes.map(n => `<p class="note">📝 ${{n}}</p>`).join('')}}
                        ` : ''}}
                        
                        <h3>Cookies After</h3>
                        <div>
                            ${{Object.entries(step.cookies_after || {{}}).map(([k, v]) => `
                                <span class="cookie ${{importantCookies.includes(k) ? 'important' : ''}}">${{k}}: ${{String(v).substring(0, 30)}}...</span>
                            `).join('')}}
                        </div>
                        
                        ${{step.requests.length ? `
                            <h3>Requests</h3>
                            ${{step.requests.slice(0, 20).map(r => `
                                <div class="request">
                                    <span class="method">${{r.method}}</span>
                                    <span class="url">${{r.url}}</span>
                                    <span class="status ${{r.status >= 200 && r.status < 400 ? 'ok' : 'error'}}">${{r.status}}</span>
                                    <span class="duration">${{r.duration}}ms</span>
                                </div>
                            `).join('')}}
                        ` : ''}}
                    </div>
                </div>
            `).join('');
        }}
        
        function renderRequests() {{
            const container = document.getElementById('requests-container');
            window.allRequests = requests;
            updateRequestsList(requests);
        }}
        
        function updateRequestsList(reqs) {{
            const container = document.getElementById('requests-container');
            container.innerHTML = reqs.map(r => `
                <div class="request">
                    <span class="method">${{r.method}}</span>
                    <span class="url">${{r.url}}</span>
                    <span class="status ${{r.status >= 200 && r.status < 400 ? 'ok' : 'error'}}">${{r.status}}</span>
                    <span class="duration">${{r.duration}}ms</span>
                </div>
            `).join('');
        }}
        
        function filterRequests(query) {{
            const filtered = window.allRequests.filter(r => 
                r.url.toLowerCase().includes(query.toLowerCase()) ||
                r.method.toLowerCase().includes(query.toLowerCase())
            );
            updateRequestsList(filtered);
        }}
        
        function renderUrls() {{
            const container = document.getElementById('urls-container');
            container.innerHTML = urlHistory.map(([time, url]) => `
                <div>
                    <span class="time">${{time.toFixed(1)}}s</span>
                    <span class="url">${{url}}</span>
                </div>
            `).join('');
        }}
        
        function renderRaw() {{
            document.getElementById('raw-steps').textContent = JSON.stringify(steps, null, 2);
            document.getElementById('raw-requests').textContent = JSON.stringify(requests.slice(-50), null, 2);
        }}
        
        // Init
        renderSteps();
        renderRequests();
        renderUrls();
        renderRaw();
    </script>
</body>
</html>'''
