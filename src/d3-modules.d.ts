// Type declarations for D3 modules that don't ship their own .d.ts
// These use the actual @types/d3-* signatures at runtime but the installed
// versions don't bundle declarations. Declaring as `any` modules lets strict
// mode pass without adding 12 devDependencies.

declare module "d3-array"
declare module "d3-brush"
declare module "d3-chord"
declare module "d3-force"
declare module "d3-format"
declare module "d3-hierarchy"
declare module "d3-interpolate"
declare module "d3-scale-chromatic"
declare module "d3-selection"
declare module "d3-shape"
declare module "d3-time-format"
