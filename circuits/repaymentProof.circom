pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";

template RepaymentProof() {
    // Private inputs
    signal input totalLoans;
    signal input repaidLoans;

    // Public inputs
    signal input minRepaymentRate; // e.g., 80 for 80%

    // Output
    signal output valid;

    // Calculate repayment rate * 100 to avoid decimals
    signal repaymentRate;
    repaymentRate <== repaidLoans * 100;

    signal threshold;
    threshold <== totalLoans * minRepaymentRate;

    // Prove repaymentRate >= threshold
    component gte = GreaterEqThan(32);
    gte.in[0] <== repaymentRate;
    gte.in[1] <== threshold;

    valid <== gte.out;
}

component main {public [minRepaymentRate]} = RepaymentProof();
