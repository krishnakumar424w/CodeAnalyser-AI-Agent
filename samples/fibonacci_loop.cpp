#include <iostream>

/**
 * Iterative Loop Fibonacci
 * Classification: Easy (a)
 * Time Complexity: O(N)
 * Space Complexity: O(1)
 */
long long fibonacci_loop(int n) {
    if (n <= 0) return 0;
    if (n == 1) return 1;

    long long a = 0, b = 1;
    for (int i = 2; i <= n; i++) {
        long long c = a + b;
        a = b;
        b = c;
    }
    return b;
}

int main() {
    int n = 10;
    std::cout << "Fibonacci Loop(" << n << ") = " << fibonacci_loop(n) << std::endl;
    return 0;
}
