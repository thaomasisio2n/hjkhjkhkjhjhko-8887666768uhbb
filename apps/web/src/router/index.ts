import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: (to, from) => (to.path === from.path ? undefined : { top: 0 }),
  routes: [
    { path: "/", redirect: "/lobby" },
    { path: "/login", name: "login", component: () => import("../views/LoginView.vue"), meta: { guestOnly: true } },
    { path: "/register", name: "register", component: () => import("../views/RegisterView.vue"), meta: { guestOnly: true } },
    { path: "/lobby", name: "lobby", component: () => import("../views/LobbyView.vue"), meta: { requiresAuth: true } },
    { path: "/play/:slug", name: "play", component: () => import("../views/GamePlaceholderView.vue"), meta: { requiresAuth: true } },
    { path: "/wallet", name: "wallet", component: () => import("../views/WalletView.vue"), meta: { requiresAuth: true } },
    { path: "/referrals", name: "referrals", component: () => import("../views/ReferralsView.vue"), meta: { requiresAuth: true } },
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

export default router;
