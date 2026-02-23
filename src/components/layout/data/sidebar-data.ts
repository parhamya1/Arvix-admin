import {
  LayoutDashboard,
  Monitor,
  Bell,
  Palette,
  Settings,
  Wrench,
  UserCog,
  Users,
  FolderTree,
  Table2,
  SquareFunction,
  FileBarChart2,
  AudioWaveform,
  Command,
  GalleryVerticalEnd,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'satnaing',
    email: 'satnaingdev@gmail.com',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'Shadcn Admin',
      logo: Command,
      plan: 'Vite + ShadcnUI',
    },
    {
      name: 'Acme Inc',
      logo: GalleryVerticalEnd,
      plan: 'Enterprise',
    },
    {
      name: 'Acme Corp.',
      logo: AudioWaveform,
      plan: 'Startup',
    },
  ],
  navGroups: [
    {
      title: 'General',
      items: [
        {
          title: 'Dashboard',
          url: '/',
          icon: LayoutDashboard,
        },
        {
          title: 'User Management',
          url: '/users',
          icon: Users,
        },
        {
          title: 'Reporting',
          icon: FileBarChart2,
          items: [
            {
              title: 'CM',
              items: [
                {
                  title: 'Raw Data',
                  items: [
                    { title: 'Huawei', url: '/reporting/cm/raw/huawei' },
                    { title: 'Nokia', url: '/reporting/cm/raw/nokia' },
                    { title: 'Ericsson', url: '/reporting/cm/raw/ericsson' },
                  ],
                },
                {
                  title: 'History',
                  url: '/reporting/cm/history',
                },
              ],
            },
            {
              title: 'PM',
              items: [
                {
                  title: 'Raw Data',
                  items: [
                    { title: 'Huawei', url: '/reporting/pm/raw/huawei' },
                    { title: 'Nokia', url: '/reporting/pm/raw/nokia' },
                    { title: 'Ericsson', url: '/reporting/pm/raw/ericsson' },
                  ],
                },
                {
                  title: 'History (Counter Changes)',
                  url: '/reporting/pm/history',
                },
              ],
            },
            {
              title: 'License',
              items: [
                {
                  title: 'Raw Data',
                  items: [
                    { title: 'Huawei', url: '/reporting/license/raw/huawei' },
                    { title: 'Nokia', url: '/reporting/license/raw/nokia' },
                    {
                      title: 'Ericsson',
                      url: '/reporting/license/raw/ericsson',
                    },
                  ],
                },
                {
                  title: 'History',
                  url: '/reporting/license/history',
                },
              ],
            },
            {
              title: 'Inventory',
              items: [
                {
                  title: 'Raw Data',
                  items: [
                    { title: 'Huawei', url: '/reporting/inventory/raw/huawei' },
                    { title: 'Nokia', url: '/reporting/inventory/raw/nokia' },
                    {
                      title: 'Ericsson',
                      url: '/reporting/inventory/raw/ericsson',
                    },
                  ],
                },
                {
                  title: 'History',
                  url: '/reporting/inventory/history',
                },
              ],
            },
            {
              title: 'User Log',
              items: [
                {
                  title: 'Row Data',
                  items: [
                    { title: 'Nokia', url: '/reporting/user-log/raw/nokia' },
                  ],
                },
                {
                  title: 'Change Analysis',
                  items: [
                    {
                      title: 'Nokia',
                      items: [
                        {
                          title: 'Applied Configuration Changes',
                          url: '/reporting/user-log/history',
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          title: 'Category Management',
          url: '/settings/category-management',
          icon: FolderTree,
        },
        {
          title: 'Table Management',
          url: '/settings/table-management',
          icon: Table2,
        },
      ],
    },

    {
      title: 'KPI',
      items: [
        {
          title: 'KPI List',
          url: '/kpis',
          icon: SquareFunction,
        },
        {
          title: 'KPI Builder',
          url: '/kpis/new',
          icon: SquareFunction,
        },
      ],
    },
    {
      title: 'Other',
      items: [
        {
          title: 'Settings',
          icon: Settings,
          items: [
            {
              title: 'Profile',
              url: '/settings',
              icon: UserCog,
            },
            {
              title: 'Account',
              url: '/settings/account',
              icon: Wrench,
            },
            {
              title: 'Appearance',
              url: '/settings/appearance',
              icon: Palette,
            },
            {
              title: 'Notifications',
              url: '/settings/notifications',
              icon: Bell,
            },
            {
              title: 'Display',
              url: '/settings/display',
              icon: Monitor,
            },
          ],
        },
      ],
    },
  ],
}
