import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { setTitle } from "../lib/title";

declare module "vue-router" {
  interface RouteMeta {
    requiresAuth?: boolean;
    guestOnly?: boolean;
    title?: string;
  }
}

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: (to, from) => (to.path === from.path ? undefined : { top: 0 }),
  routes: [
    { path: "/", redirect: "/lobby" },
    { path: "/login", name: "login", component: () => import("../views/LoginView.vue"), meta: { guestOnly: true, title: "Sign in" } },
    { path: "/register", name: "register", component: () => import("../views/RegisterView.vue"), meta: { guestOnly: true, title: "Register" } },
    { path: "/lobby", name: "lobby", component: () => import("../views/LobbyView.vue"), meta: { requiresAuth: true, title: "Casino" } },
    { path: "/play/:slug", name: "play", component: () => import("../views/GamePlaceholderView.vue"), meta: { requiresAuth: true } },
    { path: "/wallet", name: "wallet", component: () => import("../views/WalletView.vue"), meta: { requiresAuth: true, title: "Wallet" } },
    { path: "/referrals", name: "referrals", component: () => import("../views/ReferralsView.vue"), meta: { requiresAuth: true, title: "Refer & Earn" } },
    { path: "/settings", name: "settings", component: () => import("../views/SettingsView.vue"), meta: { requiresAuth: true, title: "Settings" } },
    { path: "/:pathMatch(.*)*", name: "not-found", component: () => import("../views/NotFoundView.vue"), meta: { title: "Page not found" } },
  ],
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: "login" };
  }
  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: "lobby" };
  }
});

// Views with dynamic titles (game page, lobby tabs) refine this after load.
router.afterEach((to) => setTitle(to.meta.title));

export default router;
