// Architecture rules (fitness functions) — the equivalent of ClassifiedAds.ArchTests in the .NET repo.
// Run: npm run arch
//
//   presentation ─┐
//                 ├─► application ─► domain
//   infrastructure┘
//   main.ts (composition root) may know everything.

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'domain-is-pure',
      comment: 'Domain is the innermost core: it must not know Application, Infrastructure, Presentation or the composition root.',
      severity: 'error',
      from: { path: '^src/domain' },
      to: { path: '^src/(application|infrastructure|presentation|main\\.ts)' },
    },
    {
      name: 'domain-no-npm',
      comment: 'Domain depends on no external libraries (not even Node built-ins), so it stays testable and portable.',
      severity: 'error',
      from: { path: '^src/domain' },
      to: { dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'core'] },
    },
    {
      name: 'application-depends-only-on-domain',
      comment: 'Application defines ports (interfaces) and use cases; it must not know concrete adapters.',
      severity: 'error',
      from: { path: '^src/application' },
      to: { path: '^src/(infrastructure|presentation|main\\.ts)' },
    },
    {
      name: 'application-no-npm',
      comment: 'Use cases never call Express, pg, crypto... directly — everything goes through a port.',
      severity: 'error',
      from: { path: '^src/application' },
      to: { dependencyTypes: ['npm', 'npm-dev', 'npm-optional', 'npm-peer', 'core'] },
    },
    {
      name: 'presentation-not-to-infrastructure',
      comment: 'The HTTP layer only talks to use cases; it must not reach down into the database or adapters.',
      severity: 'error',
      from: { path: '^src/presentation' },
      to: { path: '^src/(infrastructure|main\\.ts)' },
    },
    {
      name: 'infrastructure-not-to-presentation',
      comment: 'Infrastructure adapters know nothing about HTTP.',
      severity: 'error',
      from: { path: '^src/infrastructure' },
      to: { path: '^src/(presentation|main\\.ts)' },
    },
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    // Rules apply to production code. Tests may wire layers together
    // (like a miniature composition root), so they are excluded.
    exclude: { path: '\\.(test|contract)\\.ts$' },
    doNotFollow: { path: 'node_modules' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      extensions: ['.ts', '.js'],
    },
  },
};
