#include <iostream>
#include <vector>

/**
 * Dynamic Programming (Tabulation) Fibonacci
 * Classification: Hard (c)
 * Time Complexity: O(N)
 * Space Complexity: O(N) auxiliary vector
 */
long long fibonacci_dp(int n) {
    if (n <= 0) return 0;
    if (n == 1) return 1;

    // Explicit Dynamic Programming state vector
    std::vector<long long> dp(n + 1, 0);
    dp[0] = 0;
    dp[1] = 1;

    // State transition
    for (int i = 2; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];
    }

    return dp[n];
}

int main() {
    int n = 10;
    std::cout << "Fibonacci DP(" << n << ") = " << fibonacci_dp(n) << std::endl;
    return 0;
}
