// Return the node from the collection that matches the provided ID, or throw an error if no match
export function find(nodeById, id) {
    var node = nodeById.get(id);
    if (!node) throw new Error('missing: ' + id);
    return node;
  }