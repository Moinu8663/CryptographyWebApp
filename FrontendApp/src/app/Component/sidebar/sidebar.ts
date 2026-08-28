import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatTooltipModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {
  collapsed = signal(false);

  navItems: NavItem[] = [
    { label: 'Encrypt / Decrypt', icon: 'enhanced_encryption', route: '/crypto' },
    { label: 'JSON Formatter',    icon: 'data_object',          route: '/json-formatter' },
    { label: 'API Tester',        icon: 'api',                  route: '/tester' },
  ];

  toggle() { this.collapsed.update(v => !v); }
}
