import Head from '@docusaurus/Head';
import useBaseUrl from '@docusaurus/useBaseUrl';

// No <Layout> on purpose -- this is a full-viewport tap-through slide deck
// (Stories-style), and the docs navbar/footer would eat into that. The
// actual page lives in static/wrapped/sprint-1.html as a fully self-
// contained document (own fonts inlined, own JS) -- iframed here just to
// give it a clean site route and a spot in the docs nav, not because it
// needs anything Docusaurus provides.
export default function SprintWrapped() {
  const src = useBaseUrl('/wrapped/sprint-1.html');
  return (
    <>
      <Head>
        <title>Sprint 1 Wrapped — Cocoa CUSAR</title>
      </Head>
      <iframe
        src={src}
        title="Sprint 1 Wrapped"
        style={{
          display: 'block',
          width: '100vw',
          height: '100dvh',
          border: 'none',
        }}
      />
    </>
  );
}
