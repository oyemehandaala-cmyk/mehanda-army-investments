/**
 * DEMO — ILLUSTRATIVE DATA ONLY
 * 
 * DISCLAIMER:
 * This data is purely simulated for interactive demonstration purposes.
 * It does NOT represent actual customer accounts, guaranteed returns, or real assets under management.
 */

export const INITIAL_DEMO_PORTFOLIO = {
  accountName: "Demo Investor Portfolio",
  accountNumber: "DEMO-MAI-78901",
  accountType: "Simulated Balanced Wealth Blueprint",
  asOfDate: "Current Period",
  totalValue: 2500000,
  initialCapital: 2000000,
  unrealizedReturnPercentage: 25.0,
  monthlySipAmount: 25000,
  riskCategory: "Balanced Dynamic (Simulated)",
  
  allocation: [
    { name: "Large Cap Bluechip Equities", percentage: 45, value: 1125000, color: "#876A2E" },
    { name: "Sovereign & AAA Corporate Debt", percentage: 30, value: 750000, color: "#50745A" },
    { name: "Sovereign Gold Bonds / Precious Metals", percentage: 15, value: 375000, color: "#F59E0B" },
    { name: "Liquid Arbitrage & Capital Reserves", percentage: 10, value: 250000, color: "#3B82F6" }
  ],

  sampleHoldings: [
    { asset: "Broad Market Index Strategy", category: "Equity", allocation: "30%", trend: "+14.2% p.a. (Historical Index Benchmark)" },
    { asset: "Midcap Compounder Basket", category: "Equity", allocation: "15%", trend: "+17.8% p.a. (Historical Index Benchmark)" },
    { asset: "Govt of India 10-Yr Benchmark G-Sec", category: "Debt", allocation: "20%", trend: "7.15% Yield to Maturity" },
    { asset: "Corporate AAA High-Yield Bond Fund", category: "Debt", allocation: "10%", trend: "7.80% Yield to Maturity" },
    { asset: "Sovereign Gold Bond Tranche", category: "Gold/Commodities", allocation: "15%", trend: "Capital appreciation + 2.5% fixed" },
    { asset: "Overnight & Liquid Cash Buffer", category: "Liquid", allocation: "10%", trend: "T+1 Liquidity Protection" }
  ],

  sampleTransactions: [
    { id: "TX-901", date: "15 Oct 2026", description: "Monthly Disciplined SIP Allocation", amount: "₹25,000", type: "Credit", status: "Executed (Simulated)" },
    { id: "TX-902", date: "01 Oct 2026", description: "Quarterly Asset Rebalancing & Profit Locking", amount: "₹45,000", type: "Rebalance", status: "Executed (Simulated)" },
    { id: "TX-903", date: "15 Sep 2026", description: "Monthly Disciplined SIP Allocation", amount: "₹25,000", type: "Credit", status: "Executed (Simulated)" },
    { id: "TX-904", date: "22 Aug 2026", description: "Debt Yield Dividend Distribution", amount: "₹8,450", type: "Credit", status: "Executed (Simulated)" }
  ]
};
