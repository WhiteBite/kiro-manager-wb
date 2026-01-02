"""
Script Collector - collects all JS scripts from pages during registration.

Usage:
    from debugger.collectors.script_collector import ScriptCollector
    
    collector = ScriptCollector()
    collector.collect(page)  # Call after each page load
    collector.save()  # Save at the end
"""

import json
import hashlib
import base64
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse
from typing import Optional


class ScriptCollector:
    """Collects all JS scripts from browser pages."""
    
    _instance: Optional['ScriptCollector'] = None
    
    def __init__(self, output_dir: Path = None):
        if output_dir is None:
            from core.paths import get_paths
            paths = get_paths()
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_dir = paths.debug_sessions_dir / 'aws_scripts' / timestamp
        
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.collected = {}  # url -> filepath
        self.page_count = 0
        self.enabled = True
        
        print(f"[ScriptCollector] Output: {self.output_dir}")
    
    @classmethod
    def get_instance(cls) -> 'ScriptCollector':
        """Get singleton instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    @classmethod
    def reset(cls):
        """Reset singleton (for new registration session)."""
        if cls._instance:
            cls._instance.save()
        cls._instance = None
    
    def collect(self, page, page_name: str = None) -> int:
        """
        Collect all JS scripts from current page.
        
        Args:
            page: DrissionPage ChromiumPage instance
            page_name: Optional name for this page (auto-generated if not provided)
            
        Returns:
            Number of new scripts collected
        """
        if not self.enabled:
            return 0
            
        self.page_count += 1
        url = page.url
        
        if not page_name:
            parsed = urlparse(url)
            page_name = f"{self.page_count:02d}_{parsed.netloc.replace('.', '_')}"
        
        print(f"[ScriptCollector] Page {self.page_count}: {url[:60]}...")
        
        # Get all script URLs from page
        try:
            js_urls = page.run_js('''
                const urls = new Set();
                
                // Script tags with src
                document.querySelectorAll('script[src]').forEach(s => {
                    if (s.src) urls.add(s.src);
                });
                
                // Performance API - catches dynamically loaded scripts
                performance.getEntriesByType('resource').forEach(r => {
                    if (r.name.includes('.js') || r.initiatorType === 'script') {
                        urls.add(r.name);
                    }
                });
                
                return Array.from(urls);
            ''') or []
        except Exception as e:
            print(f"[ScriptCollector] Error getting scripts: {e}")
            js_urls = []
        
        print(f"[ScriptCollector] Found {len(js_urls)} script URLs")
        
        # Create page directory
        page_dir = self.output_dir / page_name
        page_dir.mkdir(exist_ok=True)
        
        new_count = 0
        for js_url in js_urls:
            if js_url in self.collected:
                continue
            
            try:
                # Use CDP to fetch script content (bypasses CORS)
                result = page.run_cdp('Network.loadNetworkResource', 
                    frameId=page.run_cdp('Page.getFrameTree')['frameTree']['frame']['id'],
                    url=js_url,
                    options={'disableCache': False, 'includeCredentials': False}
                )
                
                content = None
                if result.get('resource', {}).get('success'):
                    # Content might be base64 encoded
                    stream = result['resource'].get('stream')
                    if stream:
                        # Read from stream
                        data = page.run_cdp('IO.read', handle=stream)
                        content = data.get('data', '')
                        if data.get('base64Encoded'):
                            content = base64.b64decode(content).decode('utf-8', errors='ignore')
                        page.run_cdp('IO.close', handle=stream)
                    else:
                        content = result['resource'].get('content', '')
                
                if not content or len(content) < 50:
                    # Fallback: try regular fetch
                    content = page.run_js(f'''
                        return await fetch("{js_url}").then(r => r.text()).catch(() => null);
                    ''')
                
                if content and len(content) > 50:
                    # Generate safe filename
                    parsed = urlparse(js_url)
                    filename = parsed.path.split('/')[-1] or 'script.js'
                    filename = filename.split('?')[0]
                    if not filename.endswith('.js'):
                        filename += '.js'
                    
                    # Add hash for uniqueness
                    url_hash = hashlib.md5(js_url.encode()).hexdigest()[:8]
                    filename = f"{url_hash}_{filename}"
                    
                    # Save script
                    filepath = page_dir / filename
                    filepath.write_text(content, encoding='utf-8')
                    
                    self.collected[js_url] = str(filepath)
                    new_count += 1
                    
                    size_kb = len(content) / 1024
                    print(f"[ScriptCollector] ✓ {filename} ({size_kb:.1f}KB)")
                    
            except Exception as e:
                # Try simple approach as last resort
                try:
                    content = page.run_js(f'return await fetch("{js_url}").then(r=>r.text()).catch(()=>null)')
                    if content and len(content) > 50:
                        parsed = urlparse(js_url)
                        filename = parsed.path.split('/')[-1] or 'script.js'
                        filename = filename.split('?')[0]
                        if not filename.endswith('.js'):
                            filename += '.js'
                        url_hash = hashlib.md5(js_url.encode()).hexdigest()[:8]
                        filename = f"{url_hash}_{filename}"
                        filepath = page_dir / filename
                        filepath.write_text(content, encoding='utf-8')
                        self.collected[js_url] = str(filepath)
                        new_count += 1
                        print(f"[ScriptCollector] ✓ {filename} (fallback)")
                except:
                    pass
        
        print(f"[ScriptCollector] Downloaded {new_count} new scripts")
        return new_count
    
    def save(self) -> Path:
        """Save index of all collected scripts."""
        index = {
            'timestamp': datetime.now().isoformat(),
            'pages': self.page_count,
            'total_scripts': len(self.collected),
            'scripts': self.collected
        }
        
        index_file = self.output_dir / 'index.json'
        with open(index_file, 'w', encoding='utf-8') as f:
            json.dump(index, f, indent=2, ensure_ascii=False)
        
        print(f"[ScriptCollector] Saved index: {index_file}")
        print(f"[ScriptCollector] Total: {len(self.collected)} scripts from {self.page_count} pages")
        
        return index_file
    
    def disable(self):
        """Disable collection."""
        self.enabled = False
    
    def enable(self):
        """Enable collection."""
        self.enabled = True


# Global function for easy access
def collect_scripts(page, page_name: str = None) -> int:
    """Collect scripts from page using singleton collector."""
    return ScriptCollector.get_instance().collect(page, page_name)


def save_collected_scripts() -> Path:
    """Save all collected scripts."""
    return ScriptCollector.get_instance().save()
