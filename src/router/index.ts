/* Rotas: hash (#/tabs/…) para funcionar em qualquer hospedagem estática,
   no GitHub Pages e offline, sem configuração de servidor. */
import { createRouter, createWebHashHistory } from '@ionic/vue-router';
import type { RouteRecordRaw } from 'vue-router';
import ShellPage from '@/views/ShellPage.vue';

const routes: RouteRecordRaw[] = [
  { path: '/', redirect: '/tabs/inicio' },
  {
    path: '/tabs/',
    component: ShellPage,
    children: [
      { path: '', redirect: '/tabs/inicio' },
      { path: 'inicio', component: () => import('@/views/tabs/InicioTab.vue') },
      { path: 'documento', component: () => import('@/views/tabs/DocumentoTab.vue') },
      { path: 'terreno', component: () => import('@/views/tabs/TerrenoTab.vue') },
      { path: 'arquivos', component: () => import('@/views/tabs/ArquivosTab.vue') },
      { path: 'acervo', component: () => import('@/views/tabs/AcervoTab.vue') },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: '/tabs/inicio' },
];

export const router = createRouter({ history: createWebHashHistory(import.meta.env.BASE_URL), routes });
