import pytest
from rigby.utils.generator import Valgen

def test_gen_rand():
    assert Valgen.gen_rand(0, 0) == 0
    assert Valgen.gen_rand(0, 1) in [0, 1]
    assert Valgen.gen_rand(1, 1) == 1
    assert Valgen.gen_rand(0, 2) in [0, 1, 2]
    assert Valgen.gen_rand(1, 2) in [1, 2]
    assert Valgen.gen_rand(2, 2) == 2
    assert Valgen.gen_rand(-1, 1) in [-1, 0, 1]

def test_smart_rand():
    assert Valgen.smart_rand(0, 0, 0, 0) == 0
    assert Valgen.smart_rand(0, 1, 0, 0) in [0, 1]
    assert Valgen.smart_rand(1, 1, 1, 0) == 1
    assert Valgen.smart_rand(0, 2, 0, 0) in [0, 1, 2]
    assert Valgen.smart_rand(1, 2, 1, 0) in [1, 2]
    assert Valgen.smart_rand(2, 2, 2, 0) == 2
    assert Valgen.smart_rand(-1, 1, 0, 0) in [-1, 0, 1]
    assert Valgen.smart_rand(0, 0, 0, 1) in [0, 1]
    assert Valgen.smart_rand(0, 1, 0, 1) in [0, 1, 2]
    assert Valgen.smart_rand(1, 1, 1, 1) in [0, 1, 2]
    assert Valgen.smart_rand(0, 2, 0, 1) in [0, 1, 2, 3]
    assert Valgen.smart_rand(1, 2, 1, 1) in [0, 1, 2, 3]
    assert Valgen.smart_rand(2, 2, 2, 1) in [1, 2, 3]
    assert Valgen.smart_rand(-1, 1, 0, 1) in [-1, 0, 1, 2]