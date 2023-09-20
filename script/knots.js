
const $ = q => document.querySelector(q);
const $$ = q => [...document.querySelectorAll(q)];

// I think I read somewhere this algorithm is biased
function shuffle(arr) {
    arr.forEach((item, i) => {
        const j = Math.floor(Math.random()*arr.length);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    });
}

function dist(a, b) {
    return Math.abs(a.x-b.x) + Math.abs(a.y-b.y);
}

function contains(lst, node) {
    for (let i=0; i<lst.length; i++) {
        if (dist(lst[i], node) == 0) {
            return true;
        }
    }
    return false;
}

// Each crossing like CABDba
// Capital letters refer to string sections, from left clockwise
// Lowercase letters refer to left crossing above or below
// Any rotations or reflections are allowed but must update above/below
const knots = [
    {name: 'Trefoil', crossings: ['CABDba', 'BAFEab', 'DEFCba'], n: 10},
    {name: 'Hopf', crossings: ['ABCDba', 'DCBAba'], n: 10},
    {name: 'Double Trefoils', crossings: ['CABDba', 'BAFEab', 'DEFCba', 'IGHJba', 'HGLKab', 'JKLIba'], n: 16, hint: [[4,5],[6,9],[2,9],[12,5],[14,9],[10,9]]}
];

class Canvas {
    constructor(canvas, n) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        this.n = n;
    }

    set n(val) {
        this.n_ = val;
        this.dx = this.canvas.width / this.n;
        this.dy = this.canvas.height / this.n;
    }

    get n() {
        return this.n_;
    }

    buildKnot(knot) {
        if (!knot || !knot.name || !knot.crossings || !knot.crossings.length) {
            console.log('Bad knot');
            return;
        }
        this.knot = knot;
        this.n = knot.n;
        // Infinite loop failsafe
        for (let i=0; i<1000; i++) {
            const useHint = i > 500;
            this.buildNodes(useHint);
            const succ = this.buildPaths();
            if (succ) {
                break;
            }
        }
    }

    buildPaths() {
        this.paths = [];
        const letters = [];
        this.nodes.forEach(node => {
            const c = node.crossing;
            for (let i=0; i<4; i++) {
                if (letters.indexOf(c[i]) == -1) {
                    letters.push(c[i]);
                }
            }
        });
        letters.forEach(letter => {
            const path = [];
            this.nodes.forEach(node => {
                for (let i=0; i<4; i++) {
                    const ltr = node.crossing[i];
                    if (ltr == letter) {
                        const m = {x: node.x, y: node.y};
                        let n;
                        switch (i) {
                            case 0: n = {x: m.x-1, y: m.y}; break;
                            case 1: n = {x: m.x, y: m.y-1}; break;
                            case 2: n = {x: m.x+1, y: m.y}; break;
                            case 3: n = {x: m.x, y: m.y+1}; break;
                        }
                        if (path.length == 0) {
                            path.push(m);
                            path.push(n);
                        } else {
                            path.push(n);
                            path.push(m);
                        }
                    }
                }
            });
            this.paths.push(path);
        });
        shuffle(this.paths);
        for (let i=0; i<this.paths.length; i++) {
            const succ = this.connect(this.paths[i]);
            if (!succ) {
                return false;
            }
        }
        return true;
    }

    // A* search
    connect(path) {
        const walls = this.paths.reduce((acc, p) => acc.concat(p), []);
        const from = path[1];
        const to = path[path.length-2];
        const frontq = [from];
        const visited = [];
        const result = [];
        // Failsafe for infinite loop
        for (let i=0; i<100; i++) {
            frontq.sort((a,b) => dist(b, to) - dist(a, to));
            let node = frontq.pop();
            if (!node) {
                break;
            }
            if (dist(node, to) == 1) {
                while (dist(node, from) > 0) {
                    result.push(node);
                    node = node.prev;
                }
                result.push(path[1]);
                result.push(path[0]);
                result.reverse();
                result.push(path[path.length-2]);
                result.push(path[path.length-1]);
                path.splice(0, path.length, ...result);
                return true;
            }
            [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dx, dy]) => {
                const next = {x: node.x+dx, y: node.y+dy, prev: node};
                if (next.x < 0 || next.x >= this.n || next.y < 0 || next.y >= this.n) {
                    return;
                }
                if (!contains(walls, next) && !contains(visited, next)) {
                    visited.push(next);
                    frontq.push(next);
                }
            });
        }
        // Don't draw failed paths
        path.splice(0, path.length, path[0], path[path.length-1]);
        return false;
    }

    buildNodes(useHint) {
        this.nodes = [];
        if (useHint && this.knot.hint) {
            this.n = this.knot.n;
            for (let i=0; i<this.knot.crossings.length; i++) {
                const c = this.knot.crossings[i];
                const [x,y] = this.knot.hint[i];
                this.nodes.push({x, y, crossing: c});
            }
            return;
        }
        this.knot.crossings.forEach(crossing => {
            // Failsafe for infinite loop
            for (let a=0; a<10; a++) {
                let done = true;
                const x = Math.floor(Math.random()*(this.n-2))+1;
                const y = Math.floor(Math.random()*(this.n-2))+1;
                for (let i=0; i<this.nodes.length; i++) {
                    if (Math.abs(this.nodes[i].x-x) <= 2 
                        && Math.abs(this.nodes[i].y-y) <= 2) {
                        done = false;
                        break;
                    }
                }
                if (done) {
                    this.nodes.push({x, y, crossing});
                    break;
                }
            }
        });
    }

    drawLR(x, y, below) {
        this.ctx.fillStyle = 'black';
        const [sx, sy] = [x*this.dx, (y+0.3)*this.dy];
        const [dx, dy] = [this.dx, 0.4*this.dy];
        if (below) {
            this.ctx.fillRect(sx, sy, 0.25*dx, dy);
            this.ctx.fillRect(sx+0.75*dx, sy, 0.25*dx, dy);
        } else {
            this.ctx.fillRect(sx, sy, dx, dy);
        }
    }

    drawUD(x, y, below) {
        this.ctx.fillStyle = 'black';
        const [sx, sy] = [(x+0.3)*this.dx, y*this.dy];
        const [dx, dy] = [0.4*this.dx, this.dy];
        if (below) {
            this.ctx.fillRect(sx, sy, dx, 0.25*dy);
            this.ctx.fillRect(sx, sy+0.75*dy, dx, 0.25*dy);
        } else {
            this.ctx.fillRect(sx, sy, dx, dy);
        }
    }

    drawCornerLU(x, y) {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(x*this.dx, (y+0.3)*this.dy, 0.7*this.dx, 0.4*this.dy);
        this.ctx.fillRect((x+0.3)*this.dx, y*this.dy, 0.4*this.dx, 0.7*this.dy);
    }
    
    drawCornerRU(x, y) {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect((x+0.3)*this.dx, (y+0.3)*this.dy, 0.7*this.dx, 0.4*this.dy);
        this.ctx.fillRect((x+0.3)*this.dx, y*this.dy, 0.4*this.dx, 0.7*this.dy);
    }

    drawCornerLD(x, y) {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(x*this.dx, (y+0.3)*this.dy, 0.7*this.dx, 0.4*this.dy);
        this.ctx.fillRect((x+0.3)*this.dx, (y+0.3)*this.dy, 0.4*this.dx, 0.7*this.dy);
    }

    drawCornerRD(x, y) {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect((x+0.3)*this.dx, (y+0.3)*this.dy, 0.7*this.dx, 0.4*this.dy);
        this.ctx.fillRect((x+0.3)*this.dx, (y+0.3)*this.dy, 0.4*this.dx, 0.7*this.dy);
    }

    drawGrid() {
        this.ctx.save();
        this.ctx.strokeStyle = 'black';
        for (let i=0; i<=this.n; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.dy);
            this.ctx.lineTo(canvas.width, i * this.dy);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.dx, 0);
            this.ctx.lineTo(i * this.dx, canvas.height);
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    drawNodes() {
        this.nodes.forEach(node => {
            this.drawLR(node.x, node.y, node.crossing[4] == 'b');
            this.drawUD(node.x, node.y, node.crossing[5] == 'b');
        });
    }

    drawPaths() {
        this.paths.forEach(path => {
            for (let i=1; i<path.length-1; i++) {
                const [px, py] = [path[i-1].x, path[i-1].y];
                const [x, y] = [path[i].x, path[i].y];
                const [nx, ny] = [path[i+1].x, path[i+1].y];
                //this.ctx.fillRect(x*this.dx+5, y*this.dy+5, 5, 5);
                if (Math.abs(nx-px) == 2 && Math.abs(ny-py) == 0) {
                    this.drawLR(x, y);
                }
                if (Math.abs(nx-px) == 0 && Math.abs(ny-py) == 2) {
                    this.drawUD(x, y);
                }
                if ((((x-px) == 1) || ((x-nx) == 1)) && (((y-py) == 1) || ((y-ny) == 1))) {
                    this.drawCornerLU(x, y);
                }
                if ((((x-px) == -1) || ((x-nx) == -1)) && (((y-py) == 1) || ((y-ny) == 1))) {
                    this.drawCornerRU(x, y);
                }
                if ((((x-px) == -1) || ((x-nx) == -1)) && (((y-py) == -1) || ((y-ny) == -1))) {
                    this.drawCornerRD(x, y);
                }
                if ((((x-px) == 1) || ((x-nx) == 1)) && (((y-py) == -1) || ((y-ny) == -1))) {
                    this.drawCornerLD(x, y);
                }
            }
        });
    }

    repaint() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawGrid();
        this.drawNodes();
        this.drawPaths();
    }
}

window.addEventListener('load', () => {
    const select = $('#knots');
    knots.forEach((knot,i) => {
        const opt = document.createElement('option');
        opt.innerHTML = knot.name;
        select.appendChild(opt);
    });
    const canvas = new Canvas($('#canvas'));
    canvas.buildKnot(knots[0]);
    canvas.repaint();
    select.addEventListener('change', () => {
        canvas.buildKnot(knots[select.selectedIndex]);
        canvas.repaint();
    });
});
