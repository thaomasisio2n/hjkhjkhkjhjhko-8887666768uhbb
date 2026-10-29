// Amounts stay in USD with a "$" prefix in every language, like most crypto
// casinos; only the digit grouping follows the English convention.
export function formatMoney(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}
