import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import Heading from '@theme/Heading';
import styles from './index.module.css';

const cards = [
  {
    title: '📖 Start Here',
    to: '/docs/intro',
    description:
      'What the project is, who uses it, and a map of every repo and document in the handover folder.',
  },
  {
    title: '🏗️ Architecture',
    to: '/docs/architecture/overview',
    description:
      'Two backends, one PostgreSQL databank, two clients — how it all fits together, with diagrams.',
  },
  {
    title: '🚀 Local Setup',
    to: '/docs/getting-started/local-setup',
    description:
      'Get the database, both backends, and both apps running — in the right order, avoiding the known traps.',
  },
  {
    title: '🚨 Critical Issues',
    to: '/docs/critical-issues',
    description:
      'The living tracker of points that must be fixed, prioritized, with SQL and verification steps.',
  },
  {
    title: '🗺️ Roadmap',
    to: '/docs/plans/roadmap',
    description:
      'Phased plan: stabilize the database, stop schema drift, then product work.',
  },
  {
    title: '🗄️ Archive',
    to: '/docs/archive',
    description:
      'Every legacy document — reports, manuals, presentations, trip feedback, datasets — hosted or indexed.',
  },
  {
    title: '🍫 Sprint 1 Wrapped',
    to: '/wrapped/sprint-1',
    description:
      'Real commit/PR/CI/task data from Sprint 1, Spotify-Wrapped style. Tap through, in Thai.',
  },
];

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          🍫 {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link className="button button--secondary button--lg" to="/docs/intro">
            Read the Docs
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Home"
      description="Team documentation for the Databank for Cocoa Supply Chain (Is Thai Cacao) capstone project.">
      <HomepageHeader />
      <main>
        <section className="container margin-vert--lg">
          <div className="row">
            {cards.map((card) => (
              <div key={card.to} className="col col--4 margin-bottom--lg">
                <Link to={card.to} className={clsx('card padding--lg', styles.homeCard)}>
                  <Heading as="h3">{card.title}</Heading>
                  <p>{card.description}</p>
                </Link>
              </div>
            ))}
          </div>
        </section>
      </main>
    </Layout>
  );
}
