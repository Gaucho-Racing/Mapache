import numpy as np

class Valgen:

    @classmethod
    def gen_rand(cls, min_val: int, max_val: int) -> int:
        """
        Generates a random integer between min_val and max_val (inclusive).
        """
        return np.random.randint(min_val, max_val+1)
    
    @classmethod
    def smart_rand(cls, min_val: int, max_val: int, prev_val: int, max_step: int, skew_point = 0.5) -> int:
        """
        Generates a random integer between min_val and max_val (inclusive) that is within max_step of prev_val.
        If prev_val is closer to the skew_point, the new value will be more likely to be higher, else it will be more likely to be lower.
        """
        if prev_val < (min_val + max_val) * skew_point:
            dir = np.random.choice([1, 1, -1])
        else:
            dir = np.random.choice([-1, -1, 1])
        step = np.random.randint(0, max_step+1)
        new_val = prev_val + dir * step
        if new_val < min_val:
            new_val = min_val
        elif new_val > max_val:
            new_val = max_val
        return new_val
