import { defineStore } from "pinia";
import type { TopupMethod } from "@novaspin/shared";
import { api } from "../lib/api";
import { useAuthStore } from "./auth";

export interface Transaction {
  id: string;
  type: string;
  amountCents: number;
  note: string | null;
  createdAt: string;
}

interface WalletState {
  balanceCents: number;
  depositLimitCents: number | null;
  depositedTodayCents: number;
}

export const useWalletStore = defineStore("wallet", {
  state: () => ({
    balanceCents: 0,
    depositLimitCents: null as number | null,
    depositedTodayCents: 0,
    transactions: [] as Transaction[],
    loading: false,
  }),
  getters: {
    // How much more can be deposited in the current rolling 24h window.
    remainingLimitCents: (state) =>
      state.depositLimitCents === null ? null : Math.max(0, state.depositLimitCents - state.depositedTodayCents),
  },
  actions: {
    apply(data: WalletState) {
      this.balanceCents = data.balanceCents;
      this.depositLimitCents = data.depositLimitCents;
      this.depositedTodayCents = data.depositedTodayCents;
      const auth = useAuthStore();
      if (auth.user) auth.user.balanceCents = data.balanceCents;
    },
    async fetchBalance() {
      const { data } = await api.get("/wallet");
      this.apply(data);
    },
    async setDepositLimit(depositLimitCents: number | null) {
      const { data } = await api.put("/wallet/limits", { depositLimitCents });
      this.apply(data);
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
    async topup(amountCents: number, method: TopupMethod) {
      this.loading = true;
      try {
        const { data } = await api.post("/wallet/topup", { amountCents, method });
        this.apply(data);
        await this.fetchTransactions();
      } finally {
        this.loading = false;
      }
    },
  },
});
