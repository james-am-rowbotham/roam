// Allow side-effect CSS imports (e.g. `import './globals.css'`) under tsc.
// Next handles CSS at build time; this just satisfies the type checker.
declare module '*.css';
