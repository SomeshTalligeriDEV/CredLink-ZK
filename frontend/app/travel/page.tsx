"use client";
import { useState, useEffect } from "react";
import { useAccount } from "wagmi";

export default function TravelPage() {
  const { address, isConnected } = useAccount();
  const [creditData, setCreditData] = useState({
    score: 782, tier: 3, tierName: "Platinum",
    collateralRatio: 110, mocaVerified: false,
    zkVerified: false, passportTokenId: null as number | null,
  });
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [verifyAddress, setVerifyAddress] = useState("");
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [mocaId, setMocaId] = useState("");
  const [registering, setRegistering] = useState(false);
  const [activeTab, setActiveTab] = useState("passport");
  const [originCountry, setOriginCountry] = useState("");
  const [destCountry, setDestCountry] = useState("");
  const [simResult, setSimResult] = useState<any>(null);

  // Generate QR code with passport data
  useEffect(() => {
    if (!address) return;
    const generateQR = async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const passportData = JSON.stringify({
          wallet: address,
          tier: creditData.tier,
          tierName: creditData.tierName,
          score: creditData.score,
          collateralRatio: creditData.collateralRatio,
          zkVerified: creditData.zkVerified,
          mocaVerified: creditData.mocaVerified,
          passportNFTTokenId: creditData.passportTokenId,
          issuedBy: "CredLink ZK",
          chain: "opBNB Testnet",
          timestamp: Date.now(),
        });
        const url = await QRCode.toDataURL(passportData, {
          width: 280,
          margin: 2,
          color: { dark: "#F0B90B", light: "#0D0D0D" },
        });
        setQrDataUrl(url);
      } catch (e) {
        console.error("QR error:", e);
      }
    };
    generateQR();
  }, [address, creditData]);

  // Moca Wallet registration
  const handleMocaRegister = async () => {
    if (!mocaId || !address) return;
    setRegistering(true);
    try {
      const res = await fetch("http://localhost:3001/api/identity/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address, mocaIdentityId: mocaId }),
      });
      const data = await res.json();
      if (data.success) {
        setCreditData((prev) => ({ ...prev, mocaVerified: true }));
      }
    } catch (e: any) {
      console.error("Moca register error:", e);
    }
    setRegistering(false);
  };

  // Verify someone else's passport
  const handleVerify = async () => {
    if (!verifyAddress) return;
    try {
      const res = await fetch(
        `http://localhost:3001/api/identity/status/${verifyAddress}`
      );
      const data = await res.json();
      setVerifyResult(data);
    } catch (e: any) {
      setVerifyResult({ error: e.message });
    }
  };

  const tierColors = ["#FF4757", "#FF9F43", "#00D2D3", "#00D084"];
  const tierColor = tierColors[creditData.tier];

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[#F0B90B]/10 border border-[#F0B90B]/30 rounded-full px-4 py-2 mb-4">
            <span className="text-[#F0B90B] text-sm font-bold">TRAVEL MODE</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">
            Your <span className="text-[#F0B90B]">Credit Passport</span>
          </h1>
          <p className="text-gray-400">
            Your credit reputation travels with you — anywhere in the world
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Moving abroad? Show this to lenders. Your on-chain history speaks for you.
          </p>
        </div>

        {/* Real Story Banner */}
        <div className="bg-[#1A1A2E] border border-[#F0B90B]/20 rounded-xl p-4 mb-8 flex items-start gap-3">
          <span className="text-2xl">&#128172;</span>
          <div>
            <p className="text-sm text-gray-300 italic">
              &quot;My friend moved from India to Germany. He had 3 years of
              on-chain freelance income but no bank credit history.
              He couldn&apos;t get a car loan to start his business.&quot;
            </p>
            <p className="text-[#F0B90B] text-xs font-bold mt-2">
              CredLink ZK fixes this. Your blockchain history IS your credit.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["passport", "verify", "connect", "migrate"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                activeTab === tab
                  ? "bg-[#F0B90B] text-black"
                  : "bg-[#1A1A25] text-gray-400 hover:text-white"
              }`}
            >
              {tab === "passport"
                ? "My Passport"
                : tab === "verify"
                ? "Verify Passport"
                : tab === "connect"
                ? "Connect Moca"
                : "Migration Sim"}
            </button>
          ))}
        </div>

        {/* TAB 1 — MY PASSPORT */}
        {activeTab === "passport" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Passport Card */}
            <div
              className="bg-[#0D0D12] border-2 rounded-2xl p-6 relative overflow-hidden"
              style={{ borderColor: tierColor }}
            >
              <div
                className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-5"
                style={{
                  background: tierColor,
                  transform: "translate(30%, -30%)",
                }}
              />

              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="text-xs text-gray-500 mb-1">CREDLINK ZK</div>
                  <div className="text-lg font-bold text-[#F0B90B]">
                    Credit Passport
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">CHAIN</div>
                  <div className="text-sm font-bold">opBNB</div>
                </div>
              </div>

              {/* Score Ring */}
              <div className="flex justify-center mb-6">
                <div className="relative w-32 h-32">
                  <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                    <circle cx="60" cy="60" r="50" fill="none" stroke="#1A1A25" strokeWidth="10" />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke={tierColor}
                      strokeWidth="10"
                      strokeDasharray={`${(creditData.score / 1000) * 314} 314`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-2xl font-bold" style={{ color: tierColor }}>
                      {creditData.score}
                    </div>
                    <div className="text-xs text-gray-500">/1000</div>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-[#1A1A25] pb-2">
                  <span className="text-gray-400 text-sm">Tier</span>
                  <span
                    className="font-bold text-sm px-3 py-1 rounded-full"
                    style={{ background: tierColor + "20", color: tierColor }}
                  >
                    {creditData.tierName}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-[#1A1A25] pb-2">
                  <span className="text-gray-400 text-sm">Collateral Required</span>
                  <span className="font-bold text-[#F0B90B]">
                    {creditData.collateralRatio}%
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-[#1A1A25] pb-2">
                  <span className="text-gray-400 text-sm">ZK Verified</span>
                  <span
                    className={`text-sm font-bold ${
                      creditData.zkVerified ? "text-green-400" : "text-gray-500"
                    }`}
                  >
                    {creditData.zkVerified ? "VERIFIED" : "PENDING"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Moca Identity</span>
                  <span
                    className={`text-sm font-bold ${
                      creditData.mocaVerified ? "text-green-400" : "text-yellow-400"
                    }`}
                  >
                    {creditData.mocaVerified ? "BOUND" : "NOT BOUND"}
                  </span>
                </div>
              </div>

              {/* Wallet Address */}
              <div className="mt-4 bg-[#0A0A12] rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">WALLET</div>
                <div className="text-xs font-mono text-gray-300 break-all">
                  {address || "0x...connect wallet"}
                </div>
              </div>
            </div>

            {/* QR Code */}
            <div className="bg-[#0D0D12] border border-[#1A1A25] rounded-2xl p-6 flex flex-col items-center justify-center">
              <h3 className="font-bold text-lg mb-2">Scan to Verify</h3>
              <p className="text-gray-400 text-sm text-center mb-6">
                Show this QR to any lender worldwide. They can verify your credit
                score instantly on-chain.
              </p>

              {qrDataUrl ? (
                <div className="bg-[#0D0D0D] p-3 rounded-xl border border-[#F0B90B]/20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDataUrl} alt="Credit Passport QR" className="w-48 h-48" />
                </div>
              ) : (
                <div className="w-48 h-48 bg-[#1A1A25] rounded-xl flex items-center justify-center">
                  <span className="text-gray-500 text-sm">Connect wallet to generate QR</span>
                </div>
              )}

              <div className="mt-6 w-full space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="text-green-400">&#10003;</span>
                  Contains: Score, Tier, ZK Status, Chain
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="text-green-400">&#10003;</span>
                  Zero personal data — privacy preserved
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="text-green-400">&#10003;</span>
                  Verifiable on opBNB Explorer
                </div>
              </div>

              <button
                onClick={() => {
                  if (!qrDataUrl) return;
                  const link = document.createElement("a");
                  link.download = "credlink-passport-qr.png";
                  link.href = qrDataUrl;
                  link.click();
                }}
                className="mt-4 w-full py-2 border border-[#F0B90B]/40 text-[#F0B90B] rounded-lg text-sm font-bold hover:bg-[#F0B90B]/10 transition-all"
              >
                Download QR Code
              </button>
            </div>
          </div>
        )}

        {/* TAB 2 — VERIFY PASSPORT */}
        {activeTab === "verify" && (
          <div className="bg-[#0D0D12] border border-[#1A1A25] rounded-2xl p-6">
            <h3 className="font-bold text-xl mb-2">Verify Credit Passport</h3>
            <p className="text-gray-400 text-sm mb-6">
              Lenders: Enter a wallet address to verify their credit standing
              on-chain. No personal data revealed.
            </p>

            <div className="flex gap-3 mb-6">
              <input
                type="text"
                placeholder="Enter wallet address 0x..."
                value={verifyAddress}
                onChange={(e) => setVerifyAddress(e.target.value)}
                className="flex-1 bg-[#1A1A25] border border-[#2A2A35] rounded-lg px-4 py-3 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-[#F0B90B]"
              />
              <button
                onClick={handleVerify}
                className="bg-[#F0B90B] text-black font-bold px-6 py-3 rounded-lg hover:bg-yellow-400 transition-all"
              >
                Verify
              </button>
            </div>

            {verifyResult && (
              <div
                className={`rounded-xl p-6 border ${
                  verifyResult.mocaVerified
                    ? "bg-green-400/5 border-green-400/20"
                    : "bg-red-400/5 border-red-400/20"
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">
                    {verifyResult.mocaVerified ? "\u2705" : "\u274C"}
                  </span>
                  <div>
                    <div className="font-bold text-lg">
                      {verifyResult.mocaVerified ? "Identity Verified" : "Not Verified"}
                    </div>
                    <div className="text-sm text-gray-400">
                      {verifyResult.message}
                    </div>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Wallet</span>
                    <span className="font-mono text-xs">
                      {verifyResult.walletAddress}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Moca Verified</span>
                    <span
                      className={
                        verifyResult.mocaVerified
                          ? "text-green-400 font-bold"
                          : "text-red-400"
                      }
                    >
                      {verifyResult.mocaVerified ? "YES" : "NO"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Can Borrow</span>
                    <span
                      className={
                        verifyResult.canBorrow
                          ? "text-green-400 font-bold"
                          : "text-yellow-400"
                      }
                    >
                      {verifyResult.canBorrow ? "YES" : "NEEDS VERIFICATION"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3 — CONNECT MOCA */}
        {activeTab === "connect" && (
          <div className="bg-[#0D0D12] border border-[#1A1A25] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-[#F0B90B]/10 rounded-xl flex items-center justify-center text-2xl">
                &#128279;
              </div>
              <div>
                <h3 className="font-bold text-xl">Connect Moca Wallet</h3>
                <p className="text-gray-400 text-sm">
                  Bind your Moca identity to this wallet — one identity, one
                  reputation, worldwide
                </p>
              </div>
            </div>

            <div className="bg-[#F0B90B]/5 border border-[#F0B90B]/20 rounded-xl p-4 mb-6">
              <div className="text-sm font-bold text-[#F0B90B] mb-2">
                Why bind Moca Identity?
              </div>
              <div className="space-y-2 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="text-green-400">&#10003;</span>
                  Prevents Sybil attacks — one person, one score
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">&#10003;</span>
                  Credit travels with YOU, not just your wallet
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">&#10003;</span>
                  Unlocks borrowing on CredLink ZK
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-400">&#10003;</span>
                  Future: transfer credit history to new wallet
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  Moca Identity ID
                </label>
                <input
                  type="text"
                  placeholder="Enter your Moca DID or identity ID..."
                  value={mocaId}
                  onChange={(e) => setMocaId(e.target.value)}
                  className="w-full bg-[#1A1A25] border border-[#2A2A35] rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#F0B90B]"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">
                  Connected Wallet
                </label>
                <div className="bg-[#1A1A25] border border-[#2A2A35] rounded-lg px-4 py-3 text-sm font-mono text-gray-400">
                  {address || "Connect MetaMask first"}
                </div>
              </div>

              <button
                onClick={handleMocaRegister}
                disabled={registering || !mocaId || !address}
                className="w-full bg-[#F0B90B] text-black font-bold py-3 rounded-xl hover:bg-yellow-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {registering ? "Binding Identity..." : "Bind Moca Identity to Wallet"}
              </button>
            </div>

            {creditData.mocaVerified && (
              <div className="mt-4 bg-green-400/10 border border-green-400/20 rounded-xl p-4 flex items-center gap-3">
                <span className="text-2xl">{"\u2705"}</span>
                <div>
                  <div className="font-bold text-green-400">Moca Identity Bound</div>
                  <div className="text-sm text-gray-400">
                    Your credit reputation is now tied to your identity. It travels
                    with you worldwide.
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4 — MIGRATION SIMULATION (Upgrade 6) */}
        {activeTab === "migrate" && (
          <div className="bg-[#0D0D12] border border-[#1A1A25] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-[#F0B90B]/10 rounded-xl flex items-center justify-center text-2xl">
                &#127758;
              </div>
              <div>
                <h3 className="font-bold text-xl">Migration Simulation</h3>
                <p className="text-gray-400 text-sm">
                  See how your credit passport benefits you when moving abroad
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Origin Country</label>
                <select
                  value={originCountry}
                  onChange={(e) => setOriginCountry(e.target.value)}
                  className="w-full bg-[#1A1A25] border border-[#2A2A35] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#F0B90B]"
                >
                  <option value="">Select origin...</option>
                  <option value="india">India</option>
                  <option value="nigeria">Nigeria</option>
                  <option value="philippines">Philippines</option>
                  <option value="brazil">Brazil</option>
                  <option value="indonesia">Indonesia</option>
                  <option value="turkey">Turkey</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Destination Country</label>
                <select
                  value={destCountry}
                  onChange={(e) => setDestCountry(e.target.value)}
                  className="w-full bg-[#1A1A25] border border-[#2A2A35] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#F0B90B]"
                >
                  <option value="">Select destination...</option>
                  <option value="germany">Germany</option>
                  <option value="usa">United States</option>
                  <option value="uk">United Kingdom</option>
                  <option value="canada">Canada</option>
                  <option value="australia">Australia</option>
                  <option value="singapore">Singapore</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => {
                if (!originCountry || !destCountry) return;
                const benefits = {
                  rentalDepositReduction: creditData.tier >= 2 ? 40 : creditData.tier >= 1 ? 20 : 0,
                  microloanApproval: creditData.score >= 500,
                  creditTransferTime: creditData.zkVerified ? "Instant" : "24-48 hours",
                  borrowingPower: creditData.tier === 3 ? "Full access" : creditData.tier === 2 ? "Standard access" : "Limited access",
                  interestRate: creditData.tier === 3 ? "2%" : creditData.tier === 2 ? "3%" : creditData.tier === 1 ? "4%" : "5%",
                };
                setSimResult(benefits);
              }}
              disabled={!originCountry || !destCountry}
              className="w-full bg-[#F0B90B] text-black font-bold py-3 rounded-xl hover:bg-yellow-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-6"
            >
              Simulate Migration
            </button>

            {simResult && (
              <div className="space-y-4">
                <div className="bg-[#F0B90B]/5 border border-[#F0B90B]/20 rounded-xl p-4">
                  <div className="text-sm font-bold text-[#F0B90B] mb-3">
                    Migration Benefits: {originCountry.charAt(0).toUpperCase() + originCountry.slice(1)} &#8594; {destCountry.charAt(0).toUpperCase() + destCountry.slice(1)}
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center border-b border-[#1A1A25] pb-2">
                      <span className="text-gray-400 text-sm">Rental Deposit Reduction</span>
                      <span className={`font-bold text-sm ${simResult.rentalDepositReduction > 0 ? "text-green-400" : "text-gray-500"}`}>
                        {simResult.rentalDepositReduction > 0 ? `${simResult.rentalDepositReduction}% OFF` : "Not eligible"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-[#1A1A25] pb-2">
                      <span className="text-gray-400 text-sm">Microloan Pre-Approval</span>
                      <span className={`font-bold text-sm ${simResult.microloanApproval ? "text-green-400" : "text-yellow-400"}`}>
                        {simResult.microloanApproval ? "APPROVED" : "NEEDS HIGHER SCORE"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center border-b border-[#1A1A25] pb-2">
                      <span className="text-gray-400 text-sm">Credit Transfer Speed</span>
                      <span className="font-bold text-sm text-[#00D2D3]">{simResult.creditTransferTime}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-[#1A1A25] pb-2">
                      <span className="text-gray-400 text-sm">Borrowing Power</span>
                      <span className="font-bold text-sm text-[#F0B90B]">{simResult.borrowingPower}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Interest Rate</span>
                      <span className="font-bold text-sm text-green-400">{simResult.interestRate}</span>
                    </div>
                  </div>
                </div>

                {/* Comparison: Without vs With CredLink */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-red-400/5 border border-red-400/20 rounded-xl p-4">
                    <div className="text-red-400 text-xs font-bold mb-2">WITHOUT CREDLINK</div>
                    <div className="space-y-2 text-sm">
                      <div className="text-gray-400">&#10007; No credit history abroad</div>
                      <div className="text-gray-400">&#10007; 3-12 month waiting period</div>
                      <div className="text-gray-400">&#10007; Full deposit on rental</div>
                      <div className="text-gray-400">&#10007; No borrowing access</div>
                    </div>
                  </div>
                  <div className="bg-green-400/5 border border-green-400/20 rounded-xl p-4">
                    <div className="text-green-400 text-xs font-bold mb-2">WITH CREDLINK ZK</div>
                    <div className="space-y-2 text-sm">
                      <div className="text-gray-300">&#10003; Portable on-chain credit</div>
                      <div className="text-gray-300">&#10003; Instant verification</div>
                      <div className="text-gray-300">&#10003; Reduced deposit (up to 40%)</div>
                      <div className="text-gray-300">&#10003; Immediate borrowing</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
