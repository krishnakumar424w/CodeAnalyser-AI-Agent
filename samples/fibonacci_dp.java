public class FibonacciDP {
    /**
     * Dynamic Programming (Tabulation) Fibonacci
     * Classification: Hard (c)
     * Time Complexity: O(N)
     * Space Complexity: O(N)
     */
    public static int fib(int n) {
        if (n <= 0) return 0;
        if (n == 1) return 1;

        // DP table allocation
        int[] dp = new int[n + 1];
        dp[0] = 0;
        dp[1] = 1;

        // State transitions
        for (int i = 2; i <= n; i++) {
            dp[i] = dp[i - 1] + dp[i - 2];
        }

        return dp[n];
    }

    public static void main(String[] args) {
        int n = 10;
        System.out.println("Fibonacci DP(" + n + ") = " + fib(n));
    }
}
