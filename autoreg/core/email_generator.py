"""
Email Generator - generates emails based on strategy

Strategies:
- single: Use IMAP email directly (one account per email)
- plus_alias: user+random@domain.com (Gmail, Outlook, etc.)
- catch_all: random@custom-domain.com (requires catch-all on domain)
- pool: Use emails from provided list
"""

import os
import json
import random
import string
from typing import Optional, Tuple, List
from dataclasses import dataclass, field


# Name pools for generating realistic emails
FIRST_NAMES = [
    'James', 'John', 'Robert', 'Michael', 'David', 'William', 'Richard', 'Joseph',
    'Thomas', 'Christopher', 'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark',
    'Mary', 'Patricia', 'Jennifer', 'Linda', 'Barbara', 'Elizabeth', 'Susan',
    'Jessica', 'Sarah', 'Karen', 'Lisa', 'Nancy', 'Betty', 'Margaret', 'Sandra',
    'Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn'
]

LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
    'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
    'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
    'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker'
]


@dataclass
class EmailResult:
    """Result of email generation"""
    registration_email: str  # Email to use for AWS registration
    imap_lookup_email: str   # Email to search in IMAP (may differ for aliases)
    display_name: str        # Name to use during registration
    
    
@dataclass
class EmailGeneratorConfig:
    """Configuration for email generator"""
    strategy: str  # 'single', 'plus_alias', 'catch_all', 'pool'
    imap_user: str
    domain: Optional[str] = None  # For catch_all
    email_pool: List[str] = field(default_factory=list)  # For pool strategy
    

class EmailGenerator:
    """
    Generates emails based on configured strategy.
    
    Usage:
        generator = EmailGenerator.from_env()
        result = generator.generate()
        # result.registration_email - use for AWS signup
        # result.imap_lookup_email - use for IMAP search
        # result.display_name - use for name field
    """
    
    def __init__(self, config: EmailGeneratorConfig):
        self.config = config
        self._pool_index = 0
        self._used_emails: set = set()
    
    @classmethod
    def from_env(cls) -> 'EmailGenerator':
        """Create generator from environment variables"""
        strategy = os.environ.get('EMAIL_STRATEGY', 'single')
        imap_user = os.environ.get('IMAP_USER', '')
        domain = os.environ.get('EMAIL_DOMAIN', '')
        
        # Parse email pool from JSON
        pool_json = os.environ.get('EMAIL_POOL', '[]')
        try:
            email_pool = json.loads(pool_json)
        except json.JSONDecodeError:
            email_pool = []
        
        config = EmailGeneratorConfig(
            strategy=strategy,
            imap_user=imap_user,
            domain=domain or imap_user.split('@')[1] if '@' in imap_user else '',
            email_pool=email_pool
        )
        
        return cls(config)
    
    def generate(self) -> EmailResult:
        """Generate email based on strategy"""
        strategy = self.config.strategy.lower()
        
        if strategy == 'single':
            return self._generate_single()
        elif strategy == 'plus_alias':
            return self._generate_plus_alias()
        elif strategy == 'catch_all':
            return self._generate_catch_all()
        elif strategy == 'pool':
            return self._generate_from_pool()
        else:
            # Fallback to single
            print(f"[!] Unknown strategy '{strategy}', falling back to 'single'")
            return self._generate_single()
    
    def _generate_single(self) -> EmailResult:
        """Single email mode - use IMAP email directly"""
        email = self.config.imap_user
        name = self._generate_name_from_email(email)
        
        return EmailResult(
            registration_email=email,
            imap_lookup_email=email,
            display_name=name
        )
    
    def _generate_plus_alias(self) -> EmailResult:
        """Plus alias mode - user+random@domain.com"""
        if '@' not in self.config.imap_user:
            raise ValueError("Invalid IMAP user email for plus_alias strategy")
        
        base, domain = self.config.imap_user.split('@', 1)
        
        # Generate unique alias
        alias_suffix = self._generate_alias_suffix()
        registration_email = f"{base}+{alias_suffix}@{domain}"
        
        # Generate realistic name
        name = self._generate_random_name()
        
        return EmailResult(
            registration_email=registration_email,
            imap_lookup_email=self.config.imap_user,  # Emails arrive to main inbox
            display_name=name
        )
    
    def _generate_catch_all(self) -> EmailResult:
        """Catch-all mode - random@custom-domain.com"""
        domain = self.config.domain
        if not domain:
            raise ValueError("Domain required for catch_all strategy")
        
        # Generate random email
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        num = random.randint(100, 9999)
        
        registration_email = f"{first}{last}{num}@{domain}"
        
        # Ensure uniqueness
        attempts = 0
        while registration_email.lower() in self._used_emails and attempts < 100:
            num = random.randint(100, 9999)
            registration_email = f"{first}{last}{num}@{domain}"
            attempts += 1
        
        self._used_emails.add(registration_email.lower())
        
        return EmailResult(
            registration_email=registration_email,
            imap_lookup_email=registration_email,  # IMAP filters by To: header
            display_name=f"{first} {last}"
        )
    
    def _generate_from_pool(self) -> EmailResult:
        """Pool mode - use emails from provided list"""
        if not self.config.email_pool:
            raise ValueError("Email pool is empty")
        
        if self._pool_index >= len(self.config.email_pool):
            raise ValueError("Email pool exhausted - no more emails available")
        
        email = self.config.email_pool[self._pool_index]
        self._pool_index += 1
        
        name = self._generate_name_from_email(email)
        
        return EmailResult(
            registration_email=email,
            imap_lookup_email=email,
            display_name=name
        )
    
    def _generate_random_name(self) -> str:
        """Generate a random realistic name"""
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        return f"{first} {last}"
    
    def _generate_name_from_email(self, email: str) -> str:
        """Extract or generate name from email address"""
        if '@' not in email:
            return self._generate_random_name()
        
        username = email.split('@')[0]
        
        # Remove plus alias if present
        if '+' in username:
            username = username.split('+')[0]
        
        # Try to extract name parts
        # Handle formats: john.smith, johnsmith, john_smith, JohnSmith
        import re
        
        # Remove numbers
        name_part = re.sub(r'\d+', '', username)
        
        # Split by common separators
        if '.' in name_part:
            parts = name_part.split('.')
        elif '_' in name_part:
            parts = name_part.split('_')
        elif '-' in name_part:
            parts = name_part.split('-')
        else:
            # Try CamelCase split
            parts = re.findall(r'[A-Z]?[a-z]+', name_part)
        
        if len(parts) >= 2:
            return ' '.join(p.capitalize() for p in parts[:2])
        elif len(parts) == 1 and parts[0]:
            # Single name - add random last name
            return f"{parts[0].capitalize()} {random.choice(LAST_NAMES)}"
        else:
            return self._generate_random_name()
    
    def _generate_alias_suffix(self) -> str:
        """Generate unique suffix for plus alias"""
        # Format: kiro_XXXXX (5 random alphanumeric)
        chars = string.ascii_lowercase + string.digits
        suffix = ''.join(random.choice(chars) for _ in range(5))
        return f"kiro{suffix}"
    
    def get_remaining_pool_count(self) -> int:
        """Get number of remaining emails in pool"""
        if self.config.strategy != 'pool':
            return -1  # Unlimited for other strategies
        return len(self.config.email_pool) - self._pool_index
    
    def reset_pool_index(self) -> None:
        """Reset pool index to start from beginning"""
        self._pool_index = 0


# Convenience function for simple usage
def generate_email() -> EmailResult:
    """Generate email using environment configuration"""
    generator = EmailGenerator.from_env()
    return generator.generate()


if __name__ == '__main__':
    # Test different strategies
    import sys
    
    print("Email Generator Test")
    print("=" * 50)
    
    # Test single
    os.environ['EMAIL_STRATEGY'] = 'single'
    os.environ['IMAP_USER'] = 'test.user@gmail.com'
    result = generate_email()
    print(f"\nSingle strategy:")
    print(f"  Registration: {result.registration_email}")
    print(f"  IMAP lookup:  {result.imap_lookup_email}")
    print(f"  Name:         {result.display_name}")
    
    # Test plus_alias
    os.environ['EMAIL_STRATEGY'] = 'plus_alias'
    result = generate_email()
    print(f"\nPlus Alias strategy:")
    print(f"  Registration: {result.registration_email}")
    print(f"  IMAP lookup:  {result.imap_lookup_email}")
    print(f"  Name:         {result.display_name}")
    
    # Test catch_all
    os.environ['EMAIL_STRATEGY'] = 'catch_all'
    os.environ['EMAIL_DOMAIN'] = 'mydomain.ru'
    result = generate_email()
    print(f"\nCatch-All strategy:")
    print(f"  Registration: {result.registration_email}")
    print(f"  IMAP lookup:  {result.imap_lookup_email}")
    print(f"  Name:         {result.display_name}")
    
    # Test pool
    os.environ['EMAIL_STRATEGY'] = 'pool'
    os.environ['EMAIL_POOL'] = '["user1@mail.ru", "user2@mail.ru", "user3@mail.ru"]'
    generator = EmailGenerator.from_env()
    print(f"\nPool strategy:")
    for i in range(3):
        result = generator.generate()
        print(f"  [{i+1}] {result.registration_email} ({result.display_name})")
    print(f"  Remaining: {generator.get_remaining_pool_count()}")
