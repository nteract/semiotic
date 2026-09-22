// The optional peer loaders deliberately return opaque modules. Keep source
// type checks independent of whether these optional packages are installed;
// applications can use each engine's own types after loading it.
declare module "matter-js" {
  const peer: unknown
  export default peer
}

declare module "@dimforge/rapier2d-compat" {
  const peer: unknown
  export default peer
}
