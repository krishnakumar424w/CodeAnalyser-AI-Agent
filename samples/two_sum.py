def two_sum(nums: list[int], target: int) -> list[int]:
    """
    Find two numbers in nums that add up to target.
    Time Complexity: O(N)
    Space Complexity: O(N)
    Difficulty Order: a (Easy)
    """
    lookup = {}
    for i, num in enumerate(nums):
        diff = target - num
        if diff in lookup:
            return [lookup[diff], i]
        lookup[num] = i
    return []

if __name__ == "__main__":
    nums = [2, 7, 11, 15]
    target = 9
    print(two_sum(nums, target))
