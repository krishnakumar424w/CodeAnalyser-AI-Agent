#include <iostream>

/**
 * Recursive Backtracking Fibonacci
 * Classification: Medium (b)
 * Time Complexity: O(2^N)
 * Space Complexity: O(N) auxiliary call stack
 */
long long fibonacci_backtrack(int n) {
    // Base cases
    if (n <= 0) return 0;
    if (n == 1) return 1;

    // Branching recursion / decision tree paths
    return fibonacci_backtrack(n - 1) + fibonacci_backtrack(n - 2);
}

int main() {
    int n = 10;
    std::cout << "Fibonacci Backtrack(" << n << ") = " << fibonacci_backtrack(n) << std::endl;
    return 0;
}
