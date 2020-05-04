"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// from Evan Wang's https://github.com/tinker10/D3-Labeler
function default_1() {
    var lab = [], anc = [], w = 1, // box width
    h = 1, // box width
    labeler = {
        start: function (x) { },
        width: function (x) { },
        height: function (x) { },
        label: function (x) { },
        anchor: function (x) { },
        alt_energy: function (x) { },
        alt_schedule: function (x) { }
    };
    var max_move = 5.0, max_angle = 0.5;
    // weights
    var w_len = 0.2, // leader line length
    w_inter = 1.0, // leader line intersection
    w_lab2 = 30.0, // label-label overlap
    w_lab_anc = 30.0, // label-anchor overlap
    w_orient = 3.0; // orientation bias
    // booleans for user defined functions
    var user_energy = false, user_schedule = false;
    var user_defined_energy, user_defined_schedule;
    var energy = function (index) {
        // energy function, tailored for label placement
        var m = lab.length, ener = 0, dx = lab[index].x - anc[index].x, dy = anc[index].y - lab[index].y, dist = Math.sqrt(dx * dx + dy * dy), overlap = true, amount = 0, theta = 0;
        // penalty for length of leader line
        if (dist > 0)
            ener += dist * w_len;
        // label orientation bias
        dx /= dist;
        dy /= dist;
        if (dx > 0 && dy > 0) {
            ener += 0 * w_orient;
        }
        else if (dx < 0 && dy > 0) {
            ener += 1 * w_orient;
        }
        else if (dx < 0 && dy < 0) {
            ener += 2 * w_orient;
        }
        else {
            ener += 3 * w_orient;
        }
        var x21 = lab[index].x, y21 = lab[index].y - lab[index].height + 2.0, x22 = lab[index].x + lab[index].width, y22 = lab[index].y + 2.0;
        var x11, x12, y11, y12, x_overlap, y_overlap, overlap_area;
        for (var i = 0; i < m; i++) {
            if (i !== index) {
                // penalty for intersection of leader lines
                var overlap_1 = intersect(anc[index].x, lab[index].x, anc[i].x, lab[i].x, anc[index].y, lab[index].y, anc[i].y, lab[i].y);
                if (overlap_1)
                    ener += w_inter;
                // penalty for label-label overlap
                x11 = lab[i].x;
                y11 = lab[i].y - lab[i].height + 2.0;
                x12 = lab[i].x + lab[i].width;
                y12 = lab[i].y + 2.0;
                x_overlap = Math.max(0, Math.min(x12, x22) - Math.max(x11, x21));
                y_overlap = Math.max(0, Math.min(y12, y22) - Math.max(y11, y21));
                overlap_area = x_overlap * y_overlap;
                ener += overlap_area * w_lab2;
            }
            // penalty for label-anchor overlap
            x11 = anc[i].x - anc[i].r;
            y11 = anc[i].y - anc[i].r;
            x12 = anc[i].x + anc[i].r;
            y12 = anc[i].y + anc[i].r;
            x_overlap = Math.max(0, Math.min(x12, x22) - Math.max(x11, x21));
            y_overlap = Math.max(0, Math.min(y12, y22) - Math.max(y11, y21));
            overlap_area = x_overlap * y_overlap;
            ener += overlap_area * w_lab_anc;
        }
        return ener;
    };
    var mcmove = function (currT) {
        // Monte Carlo translation move
        // select a random label
        var i = Math.floor(Math.random() * lab.length);
        // save old coordinates
        var x_old = lab[i].x;
        var y_old = lab[i].y;
        // old energy
        var old_energy;
        if (user_energy) {
            old_energy = user_defined_energy(i, lab, anc);
        }
        else {
            old_energy = energy(i);
        }
        // random translation
        lab[i].x += (Math.random() - 0.5) * max_move;
        lab[i].y += (Math.random() - 0.5) * max_move;
        // hard wall boundaries
        if (lab[i].x > w)
            lab[i].x = x_old;
        if (lab[i].x < 0)
            lab[i].x = x_old;
        if (lab[i].y > h)
            lab[i].y = y_old;
        if (lab[i].y < 0)
            lab[i].y = y_old;
        // new energy
        var new_energy;
        if (user_energy) {
            new_energy = user_defined_energy(i, lab, anc);
        }
        else {
            new_energy = energy(i);
        }
        // delta E
        var delta_energy = new_energy - old_energy;
        if (!(Math.random() < Math.exp(-delta_energy / currT))) {
            // move back to old coordinates
            lab[i].x = x_old;
            lab[i].y = y_old;
        }
    };
    var mcrotate = function (currT) {
        // Monte Carlo rotation move
        // select a random label
        var i = Math.floor(Math.random() * lab.length);
        // save old coordinates
        var x_old = lab[i].x;
        var y_old = lab[i].y;
        // old energy
        var old_energy;
        if (user_energy) {
            old_energy = user_defined_energy(i, lab, anc);
        }
        else {
            old_energy = energy(i);
        }
        // random angle
        var angle = (Math.random() - 0.5) * max_angle;
        var s = Math.sin(angle);
        var c = Math.cos(angle);
        // translate label (relative to anchor at origin):
        lab[i].x -= anc[i].x;
        lab[i].y -= anc[i].y;
        // rotate label
        var x_new = lab[i].x * c - lab[i].y * s, y_new = lab[i].x * s + lab[i].y * c;
        // translate label back
        lab[i].x = x_new + anc[i].x;
        lab[i].y = y_new + anc[i].y;
        // hard wall boundaries
        if (lab[i].x > w)
            lab[i].x = x_old;
        if (lab[i].x < 0)
            lab[i].x = x_old;
        if (lab[i].y > h)
            lab[i].y = y_old;
        if (lab[i].y < 0)
            lab[i].y = y_old;
        // new energy
        var new_energy;
        if (user_energy) {
            new_energy = user_defined_energy(i, lab, anc);
        }
        else {
            new_energy = energy(i);
        }
        // delta E
        var delta_energy = new_energy - old_energy;
        if (!(Math.random() < Math.exp(-delta_energy / currT))) {
            // move back to old coordinates
            lab[i].x = x_old;
            lab[i].y = y_old;
        }
    };
    var intersect = function (x1, x2, x3, x4, y1, y2, y3, y4) {
        // returns true if two lines intersect, else false
        // from http://paulbourke.net/geometry/lineline2d/
        var mua, mub;
        var denom, numera, numerb;
        denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
        numera = (x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3);
        numerb = (x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3);
        /* Is the intersection along the the segments */
        mua = numera / denom;
        mub = numerb / denom;
        if (!(mua < 0 || mua > 1 || mub < 0 || mub > 1)) {
            return true;
        }
        return false;
    };
    var cooling_schedule = function (currT, initialT, nsweeps) {
        // linear cooling
        return currT - initialT / nsweeps;
    };
    labeler.start = function (nsweeps) {
        // main simulated annealing function
        var m = lab.length, currT = 1.0, initialT = 1.0;
        for (var i = 0; i < nsweeps; i++) {
            for (var j = 0; j < m; j++) {
                if (Math.random() < 0.5) {
                    mcmove(currT);
                }
                else {
                    mcrotate(currT);
                }
            }
            currT = cooling_schedule(currT, initialT, nsweeps);
        }
    };
    labeler.width = function (x) {
        // users insert graph width
        if (!arguments.length)
            return w;
        w = x;
        return labeler;
    };
    labeler.height = function (x) {
        // users insert graph height
        if (!arguments.length)
            return h;
        h = x;
        return labeler;
    };
    labeler.label = function (x) {
        // users insert label positions
        if (!arguments.length)
            return lab;
        lab = x;
        return labeler;
    };
    labeler.anchor = function (x) {
        // users insert anchor positions
        if (!arguments.length)
            return anc;
        anc = x;
        return labeler;
    };
    labeler.alt_energy = function (x) {
        // user defined energy
        if (!arguments.length)
            return energy;
        user_defined_energy = x;
        user_energy = true;
        return labeler;
    };
    labeler.alt_schedule = function (x) {
        // user defined cooling_schedule
        if (!arguments.length)
            return cooling_schedule;
        user_defined_schedule = x;
        user_schedule = true;
        return labeler;
    };
    return labeler;
}
exports.default = default_1;
/*eslint-enable */
//# sourceMappingURL=d3labeler.js.map