#!/usr/bin/env python3
"""
Kiro Account Manager - Entry Point
Run this to start the standalone application
"""

import sys
import argparse
from pathlib import Path

__version__ = "1.0.0"

# Setup paths for both development and bundled modes
if getattr(sys, 'frozen', False):
    # Running as bundled exe - add _MEIPASS to path
    base_path = Path(sys._MEIPASS)
    sys.path.insert(0, str(base_path))
else:
    # Development mode - add parent directory
    sys.path.insert(0, str(Path(__file__).parent))


def main():
    parser = argparse.ArgumentParser(
        description='Kiro Account Manager - Standalone Application',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run.py                    # Start with default settings
  python run.py --port 8080        # Use custom port
  python run.py --no-browser       # Don't open browser automatically
  python run.py --host 0.0.0.0     # Allow external connections
        """
    )
    
    parser.add_argument(
        '--version', '-v',
        action='version',
        version=f'Kiro Account Manager v{__version__}'
    )
    
    parser.add_argument(
        '--host',
        default='127.0.0.1',
        help='Host to bind to (default: 127.0.0.1)'
    )
    
    parser.add_argument(
        '--port', '-p',
        type=int,
        default=8420,
        help='Port to listen on (default: 8420)'
    )
    
    parser.add_argument(
        '--no-browser',
        action='store_true',
        help='Do not open browser automatically'
    )
    
    parser.add_argument(
        '--debug',
        action='store_true',
        help='Enable debug mode'
    )
    
    parser.add_argument(
        '--check',
        action='store_true',
        help='Check if app can start (for CI testing)'
    )
    
    args = parser.parse_args()
    
    # Quick check mode for CI
    if args.check:
        try:
            from app.main import app
            print(f"✅ Kiro Account Manager v{__version__} - OK")
            sys.exit(0)
        except Exception as e:
            print(f"❌ Failed to load: {e}")
            sys.exit(1)
    
    # Check dependencies
    try:
        import fastapi
        import uvicorn
    except ImportError:
        print("\n❌ Missing dependencies!")
        print("   Run: pip install fastapi uvicorn[standard]\n")
        sys.exit(1)
    
    # Start application
    from app.main import run
    
    run(
        host=args.host,
        port=args.port,
        open_browser_flag=not args.no_browser
    )


if __name__ == '__main__':
    main()
