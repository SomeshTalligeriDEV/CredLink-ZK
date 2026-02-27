pragma circom 2.0.0;

include "circomlib/circuits/comparators.circom";

template WalletAgeProof() {
    // Private input
    signal input walletAgeDays;

    // Public inputs
    signal input threshold;

    // Output
    signal output valid;

    // Prove walletAgeDays >= threshold without revealing walletAgeDays
    component gte = GreaterEqThan(32);
    gte.in[0] <== walletAgeDays;
    gte.in[1] <== threshold;

    valid <== gte.out;
}

component main {public [threshold]} = WalletAgeProof();
