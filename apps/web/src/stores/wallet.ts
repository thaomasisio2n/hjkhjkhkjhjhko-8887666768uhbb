import { defineStore } from "pinia";
import { api } from "../lib/api";
import { useAuthStore } from "./auth";

export interface Transaction {
  id: string;
  type: string;
  amountCents: number;
  note: string | null;
  createdAt: string;
}

export const useWalletStore = defineStore("wallet", {
  state: () => ({
    balanceCents: 0,
    transactions: [] as Transaction[],
    loading: false,
  }),
  actions: {
    async fetchBalance() {
      const { data } = await api.get("/wallet");
      this.balanceCents = data.balanceCents;
    },
    async fetchTransactions() {
      const { data } = await api.get("/wallet/transactions");
      this.transactions = data.transactions;
    },
    async refresh() {
      await Promise.all([this.fetchBalance(), this.fetchTransactions()]);
    },
    // DEMO ONLY: this never touches a real payment rail or blockchain.
    // It always succeeds and instantly credits a fake balance.
    async topup(amountCents: number, method: "crypto_btc" | "crypto_eth" | "crypto_usdt") {
      this.loading = true;
      try {
        const { data } = await api.post("/wallet/topup", { amountCents, method });
        this.balanceCents = data.balanceCents;
        const auth = useAuthStore();
        if (auth.user) auth.user.balanceCents = data.balanceCents;
        await this.fetchTransactions();
      } finally {
        this.loading = false;
      }
    },
  },
});
