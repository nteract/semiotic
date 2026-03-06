// For a given link, return the target node's depth
function targetDepth(d) {
  return d.target.depth;
}

// The depth of a node when the nodeAlign (align) is set to 'left'
export function left(node) {
  return node.depth;
}

// The depth of a node when the nodeAlign (align) is set to 'right'
export function right(node, n) {
  return n - 1 - node.height;
}

// The depth of a node when the nodeAlign (align) is set to 'justify'
export function justify(node, n) {
  return node.sourceLinks.length ? node.depth : n - 1;
}

// The depth of a node when the nodeAlign (align) is set to 'center'
/*export function center(node) {
  return node.targetLinks.length ? node.depth
      : node.sourceLinks.length ? min(node.sourceLinks, targetDepth) - 1
      : 0;
}*/

export function center(node) {
  return node.targetLinks.length
    ? node.depth
    : node.sourceLinks.length
    ? Math.min.apply(Math, node.sourceLinks.map(targetDepth)) - 1
    : 0;
}
