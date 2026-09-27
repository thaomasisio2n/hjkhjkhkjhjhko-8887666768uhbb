<script setup lang="ts">
import { computed } from "vue";
import { useAuthStore } from "../../stores/auth";

// Wraps settings that change the account for everyone signed in to it. On the
// shared demo login the API refuses them, so they're shown but disabled.
const auth = useAuthStore();
const locked = computed(() => !!auth.user?.shared);
</script>

<template>
  <fieldset :disabled="locked" :aria-describedby="locked ? 'shared-account-note' : undefined" class="min-w-0 disabled:opacity-50" data-testid="shared-lock">
    <slot />
  </fieldset>
</template>
