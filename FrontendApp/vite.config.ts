import { defineConfig } from 'vite';

const materialModules = [
  '@angular/material/button',
  '@angular/material/icon',
  '@angular/material/input',
  '@angular/material/form-field',
  '@angular/material/tabs',
  '@angular/material/select',
  '@angular/material/tooltip',
  '@angular/material/snack-bar',
  '@angular/material/progress-spinner',
  '@angular/material/chips',
  '@angular/material/checkbox',
  '@angular/material/dialog',
  '@angular/material/card',
  '@angular/material/divider',
  '@angular/material/list',
  '@angular/material/menu',
  '@angular/material/sidenav',
  '@angular/material/toolbar',
  '@angular/material/table',
  '@angular/material/paginator',
  '@angular/material/sort',
  '@angular/material/slide-toggle',
  '@angular/material/radio',
  '@angular/material/autocomplete',
  '@angular/material/datepicker',
  '@angular/material/expansion',
  '@angular/material/stepper',
  '@angular/material/badge',
  '@angular/material/bottom-sheet',
  '@angular/material/button-toggle',
  '@angular/material/grid-list',
  '@angular/material/progress-bar',
  '@angular/material/tree',
];

export default defineConfig({
  optimizeDeps: {
    include: materialModules,
  },
  ssr: {
    optimizeDeps: {
      include: materialModules,
    },
  },
});
