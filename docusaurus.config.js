// @ts-check
// Docs site for the Cocoa Supply Chain Databank (Is Thai Cacao) capstone project.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Cocoa Databank Docs',
  tagline: 'Databank for Cocoa Supply Chain — Is Thai Cacao — team knowledge base',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  // Change these when the site gets a real host (e.g. GitHub Pages).
  url: 'https://cocoa-databank-docs.example.com',
  baseUrl: '/',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    // .md files are plain CommonMark (safe for pasted docs); use .mdx for JSX.
    format: 'detect',
    mermaid: true,
  },

  themes: ['@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
        },
        blog: {
          routeBasePath: '/log',
          blogTitle: 'Project Log',
          blogDescription:
            'Chronological log of decisions, reviews, and milestones for the Cocoa Databank project.',
          blogSidebarTitle: 'Recent entries',
          blogSidebarCount: 'ALL',
          showReadingTime: false,
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          onInlineTags: 'warn',
          onInlineAuthors: 'ignore',
          onUntruncatedBlogPosts: 'ignore',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Cocoa Databank',
        logo: {
          alt: 'Cocoa Databank Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docsSidebar',
            position: 'left',
            label: 'Docs',
          },
          {to: '/docs/phase-0', label: 'Phase 0', position: 'left'},
          {to: '/docs/critical-issues', label: 'Critical Issues', position: 'left'},
          {to: '/log', label: 'Project Log', position: 'left'},
          {to: '/docs/archive', label: 'Archive', position: 'left'},
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {label: 'Project Overview', to: '/docs/intro'},
              {label: 'Architecture', to: '/docs/architecture/overview'},
              {label: 'Database Review', to: '/docs/database/db-review'},
            ],
          },
          {
            title: 'Work',
            items: [
              {label: 'Critical Issues', to: '/docs/critical-issues'},
              {label: 'Roadmap', to: '/docs/plans/roadmap'},
              {label: 'Project Log', to: '/log'},
            ],
          },
          {
            title: 'Reference',
            items: [
              {label: 'Document Archive', to: '/docs/archive'},
              {label: 'User Manuals (Thai)', to: '/docs/archive/manuals'},
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Cocoa Databank Capstone Team. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['sql', 'kotlin', 'dart', 'bash', 'go'],
      },
    }),
};

export default config;
