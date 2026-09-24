def fibonacci_loop(n: int) -> int:
    """
    Compute the n-th Fibonacci number using an iterative loop.
    Classification: Easy (a)
    Time Complexity: O(N)
    Space Complexity: O(1)
    """
    if n <= 0:
        return 0
    if n == 1:
        return 1

    a, b = 0, 1
    for _ in range(2, n + 1):
        c = a + b
        a = b
        b = c
    return b

if __name__ == "__main__":
    n = 10
    print(f"Fibonacci({n}) =", fibonacci_loop(n))
