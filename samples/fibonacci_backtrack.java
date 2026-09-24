public class FibonacciBacktrack {
    /**
     * Recursive Backtracking Fibonacci
     * Classification: Medium (b)
     * Time Complexity: O(2^N)
     * Space Complexity: O(N) auxiliary call stack
     */
    public static int fib(int n) {
        // Base cases
        if (n <= 0) return 0;
        if (n == 1) return 1;

        // Branching recursive search tree / backtracking exploration
        return fib(n - 1) + fib(n - 2);
    }

    public static void main(String[] args) {
        int n = 10;
        System.out.println("Fibonacci Backtrack(" + n + ") = " + fib(n));
    }
}
