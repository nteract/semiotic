// returns the slope of a link, from source to target
// up => slopes up from source to target
// down => slopes down from source to target
export function incline(link) {
    return link.y0 - link.y1 > 0 ? 'up' : 'down';
}

// check if link is self linking, ie links a node to the same node
export function selfLinking(link, id) {
    return id(link.source) == id(link.target);
}

// Check if a circular link is the only circular link for both its source and target node
export function onlyCircularLink(link) {
    var nodeSourceLinks = link.source.sourceLinks;
    var sourceCount = 0;
    nodeSourceLinks.forEach(function (l) {
        sourceCount = l.circular ? sourceCount + 1 : sourceCount;
    });

    var nodeTargetLinks = link.target.targetLinks;
    var targetCount = 0;
    nodeTargetLinks.forEach(function (l) {
        targetCount = l.circular ? targetCount + 1 : targetCount;
    });

    if (sourceCount > 1 || targetCount > 1) {
        return false;
    } else {
        return true;
    }
}

// return the distance between the link's target and source node, in terms of the nodes' column
export function linkColumnDistance(link) {
    return link.target.column - link.source.column;
}

// return the distance between the link's target and source node, in terms of the nodes' X coordinate
export function linkXLength(link) {
    return link.target.x0 - link.source.x1;
}

// Return the Y coordinate on the longerLink path * which is perpendicular shorterLink's source.
// * approx, based on a straight line from target to source, when in fact the path is a bezier
export function linkPerpendicularYToLinkTarget(longerLink, shorterLink) {
    // get the angle for the longer link
    var angle = linkAngle(longerLink);

    // get the adjacent length to the other link's x position
    var heightFromY1ToPependicular = linkXLength(shorterLink) / Math.tan(angle);

    // add or subtract from longer link's original y1, depending on the slope
    var yPerpendicular =
        incline(longerLink) == 'up'
            ? longerLink.y1 - heightFromY1ToPependicular
            : longerLink.y1 + heightFromY1ToPependicular;

    return yPerpendicular;
}

// Return the Y coordinate on the longerLink path * which is perpendicular shorterLink's source.
// * approx, based on a straight line from target to source, when in fact the path is a bezier
export function linkPerpendicularYToLinkSource(longerLink, shorterLink) {
    // get the angle for the longer link
    var angle = linkAngle(longerLink);

    // get the adjacent length to the other link's x position
    var heightFromY1ToPependicular = linkXLength(shorterLink) / Math.tan(angle);

    // add or subtract from longer link1's original y1, depending on the slope
    var yPerpendicular =
        incline(longerLink) == 'up'
            ? longerLink.y1 + heightFromY1ToPependicular
            : longerLink.y1 - heightFromY1ToPependicular;

    return yPerpendicular;
}

// Return the angle between a straight line between the source and target of the link, and the vertical plane of the node
function linkAngle(link) {
    var adjacent = Math.abs(link.y1 - link.y0);
    var opposite = Math.abs(link.target.x0 - link.source.x1);

    return Math.atan(opposite / adjacent);
}