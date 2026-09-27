import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
// Self-hosted (no request to Google): the CSP allows fonts from this origin only.
import "@fontsource-variable/figtree/wght.css";
import "@fontsource-variable/figtree/wght-italic.css";
import "./style.css";

// Sessions used to be a token in localStorage; it's an httpOnly cookie now.
// Drop the leftover from returning visitors' browsers.
try {
  localStorage.removeItem("demo_token");
} catch {
  // storage unavailable
}

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount("#app");
