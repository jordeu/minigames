export const SIZE = 18;
export const DIRECTIONS = {up: [0,-1], down: [0,1], left: [-1,0], right: [1,0]};
export class Snake {
  constructor(random = Math.random) { this.random = random; this.reset(); }
  reset() {
    this.body = [[8,9],[7,9],[6,9]]; this.direction = 'right'; this.queue = [];
    this.score = 0; this.over = false; this.won = false; this.placeFood();
  }
  get interval() { return Math.max(75, 205 - Math.floor(this.score / 30) * 12); }
  turn(direction) {
    if (!DIRECTIONS[direction] || this.queue.length >= 2) return;
    const previous = this.queue.at(-1) ?? this.direction;
    const a = DIRECTIONS[previous], b = DIRECTIONS[direction];
    if (a[0] + b[0] === 0 && a[1] + b[1] === 0 || previous === direction) return;
    this.queue.push(direction);
  }
  placeFood() {
    const occupied = new Set(this.body.map(p => p.join(',')));
    const empty = [];
    for (let y=0;y<SIZE;y++) for (let x=0;x<SIZE;x++) if (!occupied.has(`${x},${y}`)) empty.push([x,y]);
    this.food = empty.length ? empty[Math.floor(this.random()*empty.length)] : null;
    if (!this.food) { this.won = true; this.over = true; }
  }
  step() {
    if (this.over) return;
    this.direction = this.queue.shift() ?? this.direction;
    const d = DIRECTIONS[this.direction], head = [this.body[0][0]+d[0],this.body[0][1]+d[1]];
    const eating = this.food && head[0] === this.food[0] && head[1] === this.food[1];
    const collisionBody = eating ? this.body : this.body.slice(0,-1);
    if (head.some(n => n<0 || n>=SIZE) || collisionBody.some(p=>p[0]===head[0] && p[1]===head[1])) { this.over=true; return; }
    this.body.unshift(head);
    if (eating) { this.score+=10; this.placeFood(); } else this.body.pop();
  }
}
