def fibonacci_backtrack(n: int) -> int:
    """
    Compute the n-th Fibonacci number using branching recursion / backtracking.
    Classification: Medium (b)
    Time Complexity: O(2^N)
    Space Complexity: O(N) auxiliary call stack
    """
    # Base cases for recursion
    if n <= 0:
        return 0
    if n == 1:
        return 1

    # Branching recursive decision paths (backtracking recursion tree)
    return fibonacci_backtrack(n - 1) + fibonacci_backtrack(n - 2)

if __name__ == "__main__":
    n = 10
    print(f"Fibonacci({n}) =", fibonacci_backtrack(n))
