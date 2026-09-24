public class FibonacciLoop {
    /**
     * Iterative Loop Fibonacci
     * Classification: Easy (a)
     * Time Complexity: O(N)
     * Space Complexity: O(1)
     */
    public static int fib(int n) {
        if (n <= 0) return 0;
        if (n == 1) return 1;

        int a = 0, b = 1;
        for (int i = 2; i <= n; i++) {
            int c = a + b;
            a = b;
            b = c;
        }
        return b;
    }

    public static void main(String[] args) {
        int n = 10;
        System.out.println("Fibonacci Loop(" + n + ") = " + fib(n));
    }
}
