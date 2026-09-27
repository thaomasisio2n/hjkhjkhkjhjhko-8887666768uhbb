import { defineStore } from "pinia";
import type { IconName } from "../lib/icons";

export type ToastTone = "success" | "info" | "error";

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  icon: IconName;
}

const DEFAULT_ICON: Record<ToastTone, IconName> = { success: "check", info: "info", error: "x" };
let nextId = 1;

export const useToastStore = defineStore("toast", {
  state: () => ({ items: [] as Toast[] }),
  actions: {
    push(message: string, tone: ToastTone = "success", icon?: IconName) {
      const id = nextId++;
      this.items = [...this.items.slice(-2), { id, message, tone, icon: icon ?? DEFAULT_ICON[tone] }];
      setTimeout(() => this.dismiss(id), 3200);
    },
    dismiss(id: number) {
      this.items = this.items.filter((t) => t.id !== id);
    },
  },
});
