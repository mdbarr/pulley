<template>
  <v-app>
    <router-view />
  </v-app>
</template>

<script>
import state from '@/state';

export default {
  name: 'App',
  data () {
    return { state };
  },
  created () {
    this.$theme.init(this);
  },
};
</script>
