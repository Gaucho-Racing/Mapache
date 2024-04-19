import pytest
from rigby.nodes.gr24.gps import GPS

def test_generate():
    gps = GPS()
    gps.generate()
    assert gps.latitude >= -90 and gps.latitude <= 90
    assert gps.longitude >= -180 and gps.longitude <= 180

def test_to_bytes():
    gps = GPS()
    gps.latitude = 34.414718
    gps.longitude = -119.841912
    assert gps.to_bytes() == bytearray(b'B\t\xa8\xac\xc2\xef\xaf\x0f')