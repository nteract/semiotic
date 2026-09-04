/**
 * Build npm pack arguments for callers that require a real tarball artifact.
 *
 * `npm publish --dry-run` exposes `npm_config_dry_run=true` to lifecycle child
 * processes. Without an explicit command-line override, a nested `npm pack`
 * exits successfully and reports a filename but intentionally writes no file.
 */
export function npmPackArtifactArgs(args = []) {
  return ["pack", ...args, "--dry-run=false"]
}
