def fibonacci_dp(n: int) -> int:
    """
    Compute the n-th Fibonacci number using Dynamic Programming (Tabulation / Memoization).
    Classification: Hard (c)
    Time Complexity: O(N)
    Space Complexity: O(N) auxiliary table
    """
    if n <= 0:
        return 0
    if n == 1:
        return 1

    # Allocate explicit Dynamic Programming state table
    dp = [0] * (n + 1)
    dp[0] = 0
    dp[1] = 1

    # State transition: dp[i] = dp[i-1] + dp[i-2]
    for i in range(2, n + 1):
        dp[i] = dp[i - 1] + dp[i - 2]

    return dp[n]

if __name__ == "__main__":
    n = 10
    print(f"Fibonacci({n}) =", fibonacci_dp(n))
