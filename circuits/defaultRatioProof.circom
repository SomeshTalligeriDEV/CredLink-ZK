pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";

template DefaultRatioProof() {
    // Private inputs
    signal input totalLoans;
    signal input defaultedLoans;

    // Public inputs
    signal input maxDefaultRate; // e.g., 20 for 20%

    // Output
    signal output valid;

    // defaultedLoans * 100 <= totalLoans * maxDefaultRate
    signal defaultRate;
    defaultRate <== defaultedLoans * 100;

    signal threshold;
    threshold <== totalLoans * maxDefaultRate;

    // Prove default rate is below threshold
    component lte = LessEqThan(32);
    lte.in[0] <== defaultRate;
    lte.in[1] <== threshold;

    valid <== lte.out;
}

component main {public [maxDefaultRate]} = DefaultRatioProof();
