import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { setTitle } from "../lib/title";
import { t } from "../i18n";

declare module "vue-router" {
  interface RouteMeta {
    requiresAuth?: boolean;
    guestOnly?: boolean;
    /** Reachable signed in or out; gets the casino shell when signed in. */
    public?: boolean;
    /** i18n key for the page title */
    title?: string;
  }
}

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: (to, from) => (to.path === from.path ? undefined : { top: 0 }),
  routes: [
    { path: "/", redirect: "/lobby" },
    { path: "/login", name: "login", component: () => import("../views/LoginView.vue"), meta: { guestOnly: true, title: "titles.signIn" } },
    { path: "/register", name: "register", component: () => import("../views/RegisterView.vue"), meta: { guestOnly: true, title: "titles.register" } },
    { path: "/lobby", name: "lobby", component: () => import("../views/LobbyView.vue"), meta: { requiresAuth: true, title: "titles.casino" } },
    { path: "/play/:slug", name: "play", component: () => import("../views/GamePlaceholderView.vue"), meta: { requiresAuth: true } },
    { path: "/wallet", name: "wallet", component: () => import("../views/WalletView.vue"), meta: { requiresAuth: true, title: "titles.wallet" } },
    { path: "/referrals", name: "referrals", component: () => import("../views/ReferralsView.vue"), meta: { requiresAuth: true, title: "titles.refer" } },
    { path: "/providers", name: "providers", component: () => import("../views/ProvidersView.vue"), meta: { requiresAuth: true, title: "titles.providers" } },
    { path: "/providers/:slug", name: "provider", component: () => import("../views/ProviderView.vue"), meta: { requiresAuth: true } },
    { path: "/help", name: "help", component: () => import("../views/HelpView.vue"), meta: { public: true, title: "titles.help" } },
    { path: "/settings", name: "settings", component: () => import("../views/SettingsView.vue"), meta: { requiresAuth: true, title: "titles.settings" } },
    { path: "/:pathMatch(.*)*", name: "not-found", component: () => import("../views/NotFoundView.vue"), meta: { title: "titles.notFound" } },
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
router.afterEach((to) => setTitle(to.meta.title ? t(to.meta.title) : undefined));

export default router;
