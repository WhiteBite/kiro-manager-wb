#!/usr/bin/env python3
"""
Download ALL JS scripts from AWS signin pages.
Just visits pages and collects scripts - no actual registration.
"""

import sys
import time
import json
import hashlib
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).parent.parent))

from DrissionPage import ChromiumPage, ChromiumOptions
from spoofers.cdp_spoofer import CDPSpoofer
from spoofers.profile import generate_random_profile


class ScriptCollector:
    def __init__(self, output_dir: Path):
        self.output_dir = output_dir
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.collected = {}
        self.page_count = 0
        
    def collect(self, page, page_name: str = None):
        self.page_count += 1
        url = page.url
        
        if not page_name:
            page_name = f"{self.page_count:02d}_{urlparse(url).netloc.replace('.', '_')}"
        
        print(f"\n[{self.page_count}] {url[:80]}")
        
        try:
            js_urls = page.run_js('''
                const urls = new Set();
                document.querySelectorAll('script[src]').forEach(s => s.src && urls.add(s.src));
                performance.getEntriesByType('resource').forEach(r => {
                    if (r.name.includes('.js')) urls.add(r.name);
                });
                return Array.from(urls);
            ''') or []
        except:
            js_urls = []
        
        print(f"    {len(js_urls)} scripts found")
        
        page_dir = self.output_dir / page_name
        page_dir.mkdir(exist_ok=True)
        
        new_count = 0
        for js_url in js_urls:
            if js_url in self.collected:
                continue
                
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
                    
                    print(f"    ✓ {filename} ({len(content)//1024}KB)")
            except:
                pass
        
        print(f"    Downloaded {new_count} new")
        return new_count
    
    def save_index(self):
        index = {
            'timestamp': datetime.now().isoformat(),
            'pages': self.page_count,
            'scripts': len(self.collected),
            'files': self.collected
        }
        index_file = self.output_dir / 'index.json'
        json.dump(index, open(index_file, 'w'), indent=2)
        return index_file


def main():
    output_dir = Path(__file__).parent.parent / 'debug_sessions' / 'aws_scripts'
    collector = ScriptCollector(output_dir)
    
    print("=" * 60)
    print("AWS Script Collector")
    print("=" * 60)
    print(f"Output: {output_dir}\n")
    
    options = ChromiumOptions()
    options.set_argument('--no-first-run')
    options.set_argument('--disable-dev-shm-usage')
    
    page = ChromiumPage(options)
    
    # Apply spoofing
    profile = generate_random_profile()
    spoofer = CDPSpoofer(profile)
    spoofer.apply_pre_navigation(page)
    
    # Pages to collect scripts from
    pages = [
        ('https://us-east-1.signin.aws/', 'signin_aws'),
        ('https://signin.aws.amazon.com/signin', 'signin_amazon'),
        ('https://profile.aws.amazon.com/', 'profile_aws'),
        ('https://console.aws.amazon.com/', 'console_aws'),
        ('https://aws.amazon.com/', 'aws_main'),
    ]
    
    for url, name in pages:
        try:
            print(f"\n>>> Opening {url}")
            page.get(url)
            time.sleep(3)
            collector.collect(page, name)
        except Exception as e:
            print(f"    Error: {e}")
    
    index_file = collector.save_index()
    page.quit()
    
    print("\n" + "=" * 60)
    print(f"DONE! {len(collector.collected)} scripts from {collector.page_count} pages")
    print(f"Output: {output_dir}")
    print("=" * 60)


if __name__ == '__main__':
    main()
