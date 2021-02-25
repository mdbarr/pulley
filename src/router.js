import Vue from 'vue';
import VueRouter from 'vue-router';

import state from '@/state';
import Home from '@/views/Home';

Vue.use(VueRouter);

const routes = [
  {
    name: 'home',
    path: '/',
    meta: { title: 'Home' },
    component: Home,
  },
];

const router = new VueRouter({
  mode: 'history',
  base: process.env.BASE_URL,
  routes,
  scrollBehavior (to, from, savedPosition) {
    let interval;

    return new Promise((resolve, reject) => {
      interval = setInterval(() => {
        if (!state.loading) {
          clearInterval(interval);
          resolve(to);
        }
      }, 250);
    });
  },
});

router.beforeEach((to, from, next) => next());

export default router;
