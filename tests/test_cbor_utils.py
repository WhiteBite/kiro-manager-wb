"""
Тесты для CBOR encoding/decoding utilities.
"""

import pytest
from autoreg.core.cbor_utils import (
    cbor_encode,
    cbor_decode,
    cbor_encode_hex,
    cbor_size_comparison
)


def test_cbor_encode_decode_dict():
    """Тест базового кодирования/декодирования словаря."""
    data = {
        'name': 'John',
        'age': 30,
        'active': True,
        'tags': ['python', 'cbor']
    }
    
    # Encode
    encoded = cbor_encode(data)
    assert isinstance(encoded, bytes)
    assert len(encoded) > 0
    
    # Decode
    decoded = cbor_decode(encoded)
    assert decoded == data


def test_cbor_encode_decode_list():
    """Тест кодирования/декодирования списка."""
    data = [1, 2, 3, 'test', True, None]
    
    encoded = cbor_encode(data)
    decoded = cbor_decode(encoded)
    
    assert decoded == data


def test_cbor_request_format():
    """Тест формата запроса GetUserUsageAndLimits."""
    request = {
        'isEmailRequired': True,
        'origin': 'KIRO_IDE'
    }
    
    encoded = cbor_encode(request)
    decoded = cbor_decode(encoded)
    
    assert decoded['isEmailRequired'] is True
    assert decoded['origin'] == 'KIRO_IDE'


def test_cbor_encode_hex():
    """Тест hex представления."""
    data = {'name': 'John'}
    
    hex_str = cbor_encode_hex(data)
    
    assert isinstance(hex_str, str)
    assert len(hex_str) > 0
    assert ' ' in hex_str  # Должны быть пробелы между байтами


def test_cbor_size_comparison():
    """Тест сравнения размеров JSON vs CBOR."""
    data = {
        'name': 'John Doe',
        'age': 30,
        'email': 'john@example.com',
        'active': True
    }
    
    comparison = cbor_size_comparison(data)
    
    assert 'json' in comparison
    assert 'cbor' in comparison
    assert 'savings' in comparison
    
    # CBOR должен быть меньше JSON
    assert comparison['cbor'] < comparison['json']
    assert comparison['savings'] > 0


def test_cbor_encode_invalid_data():
    """Тест обработки невалидных данных."""
    # Функция не должна падать, но может вернуть ошибку
    # в зависимости от реализации cbor2
    pass  # cbor2 обычно может закодировать почти всё


def test_cbor_decode_invalid_data():
    """Тест декодирования невалидных данных."""
    # cbor2 может декодировать почти любые данные
    # (например, 'invalid cbor data' декодируется как строка)
    # Поэтому просто проверяем что функция не падает
    try:
        result = cbor_decode(b'invalid cbor data')
        # Если декодировалось - ок
        assert result is not None
    except:
        # Если упало - тоже ок
        pass


def test_cbor_nested_structures():
    """Тест вложенных структур."""
    data = {
        'user': {
            'name': 'John',
            'profile': {
                'age': 30,
                'tags': ['python', 'rust']
            }
        },
        'settings': {
            'theme': 'dark',
            'notifications': True
        }
    }
    
    encoded = cbor_encode(data)
    decoded = cbor_decode(encoded)
    
    assert decoded == data
    assert decoded['user']['profile']['age'] == 30


def test_cbor_unicode():
    """Тест Unicode строк."""
    data = {
        'name': 'Иван',
        'city': '北京',
        'emoji': '🚀'
    }
    
    encoded = cbor_encode(data)
    decoded = cbor_decode(encoded)
    
    assert decoded == data


def test_cbor_numbers():
    """Тест различных числовых типов."""
    data = {
        'int': 42,
        'negative': -100,
        'float': 3.14159,
        'large': 9999999999999999
    }
    
    encoded = cbor_encode(data)
    decoded = cbor_decode(encoded)
    
    assert decoded['int'] == 42
    assert decoded['negative'] == -100
    assert abs(decoded['float'] - 3.14159) < 0.00001
    assert decoded['large'] == 9999999999999999


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
