import {
  BadgeCheck,
  Bot,
  LayoutDashboard,
  MessageCircle,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { hasPermission, type Permission, type User } from '@/features/auth/domain';

export interface InternalNavigationItem {
  readonly label: string;
  readonly href: string;
  readonly permission: Permission;
  readonly icon: LucideIcon;
}

export const INTERNAL_NAVIGATION_ITEMS: readonly InternalNavigationItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    permission: 'dashboard:view',
    icon: LayoutDashboard,
  },
  {
    label: 'Agentes de IA',
    href: '/ai-agents',
    permission: 'ai-agents:use',
    icon: Bot,
  },
  {
    label: 'Conversas WhatsApp',
    href: '/whatsapp-conversations',
    permission: 'whatsapp-conversations:manage',
    icon: MessageCircle,
  },
  {
    label: 'Usuários',
    href: '/users',
    permission: 'users:view',
    icon: Users,
  },
  {
    label: 'Papéis',
    href: '/roles',
    permission: 'settings:view',
    icon: ShieldCheck,
  },
  {
    label: 'Licença',
    href: '/license',
    permission: 'dashboard:view',
    icon: BadgeCheck,
  },
];

export function getAuthorizedNavigationItems(
  user: User,
  items: readonly InternalNavigationItem[] = INTERNAL_NAVIGATION_ITEMS,
): InternalNavigationItem[] {
  return items.filter((item) => hasPermission(user, item.permission));
}
