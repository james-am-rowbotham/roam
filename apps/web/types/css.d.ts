// Allow side-effect CSS imports (e.g. `import './globals.css'`) under tsc.
// Next.js handles these via its own loaders at build time; this keeps a plain
// `tsc --noEmit` typecheck happy.
declare module '*.css';
