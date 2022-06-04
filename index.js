const context = document.getElementById("canvas").getContext("2d");
const moveTo = p => context.moveTo(p.x, p.y);
const lineTo = p => context.lineTo(p.x, p.y);
const arc = (p, r, a, a0, a1, b = false) => context.arc(p.x, p.y, r, a0 + a, a1 + a, b);
const stroke = style => { context.strokeStyle = style; context.stroke(); };
const fill = style => { context.fillStyle = style; context.fill(); };
const reset = () => {
	const {width: w, height: h} = context.canvas.getBoundingClientRect();
	context.canvas.width = w;
	context.canvas.height = h;
	context.fillStyle = "#EEE";
	context.fillRect(0, 0, w, h);
	context.setTransform(new DOMMatrix(w > h? 
		[h / 2, 0, 0, -h / 2, h / 2 + (w - h) / 2, h / 2]: 
		[w / 2, 0, 0, -w / 2, w / 2, w / 2 + (h - w) / 2]
	));
	context.lineWidth = 0.01;
	context.lineJoin = "round";
	context.lineCap = "round";
};

const input = {pressed: false, sx: 0, sy: 0};
document.addEventListener("pointerdown", _ => input.pressed = true);
document.addEventListener("pointerup",   _ => input.pressed = false);
document.addEventListener("pointermove", e => (input.sx = e.x, input.sy = e.y));

const T = Math.sqrt(3), TAU = Math.PI * 2, R = 0.15;
const hexZero = () => ({q: 0, r: 0});
const hexAdd = (a, b) => ({q: a.q + b.q, r: a.r + b.r});
const hexSub = (a, b) => ({q: a.q - b.q, r: a.r - b.r});
const hexMul = ({q, r}, x) => ({q: q * x, r: r * x});
const hexEql = (a, b) => a.q === b.q && a.r === b.r;
const hexLen = ({q, r}) => (Math.abs(q) + Math.abs(r) + Math.abs(-q-r)) / 2;
const hexLerp = (a, b, t) => ({q: a.q + (b.q - a.q) * t, r: a.r + (b.r - a.r) * t});
const roundHex = fract => {
	let q = Math.round(fract.q);
	let r = Math.round(fract.r);
	let s = Math.round(-fract.q-fract.r);
	const q_diff = Math.abs(q - fract.q);
	const r_diff = Math.abs(r - fract.r);
	const s_diff = Math.abs(s - fract.s);
	if (q_diff > r_diff && q_diff > s_diff) q = -r-s;
	else if (r_diff > s_diff)               r = -q-s;
	else                                    s = -q-r;
	return {q, r};
};
const vecAdd = (a, b) => ({x: a.x + b.x, y: a.y + b.y});
const vecSub = (a, b) => ({x: a.x - b.x, y: a.y - b.y});
const vecMul = ({x, y}, s) => ({x: x * s, y: y * s});
const vecToAngle = ({x, y}) => Math.atan2(y, x);
const angleToVec = a => ({x: Math.cos(a), y: Math.sin(a)});
const hexToVec = ({q, r}) => ({x: q * (3/2 * R), y: R * T * (q / 2 + r)});
const vecToHex = ({x, y}) => ({q: x / (3/2 * R), r: (-x + T * y) / R / 3});

const dirs = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]].map(([q, r]) => ({q, r}));
const pathReverse = p => [...p.map(x => (x + 3) % 6)].reverse();
const pathWalk = (p, start) => p.reduce((a, b) => [...a, hexAdd(a.at(-1), dirs[b])], [start]);

const drawSnake = (path, r, centered, color) => {
	const start = centered? hexZero(): path.reduce((a, b) => hexSub(a, dirs[b]), hexZero());

	context.beginPath();
	if (path.length > 0) {
		const points = pathWalk(path, start).map(hexToVec);
		const corner = (i, angle) => vecAdd(points[i], vecMul(angleToVec(angle), r));
		const halfOfPath = () => {
			const a = vecToAngle(vecSub(points[1], points[0]));
			arc(points[0], r/2, a, -TAU / 4, TAU / 4, true);
			lineTo(corner(0, a + TAU / 12));
			for (let i = 1; i < points.length - 1; ++i) {
				const p = points[i];
				const a0 = vecToAngle(vecSub(p, points[i - 1]));
				const a1 = vecToAngle(vecSub(points[i + 1], p));
				const da = (((a1 - a0) % TAU) + TAU) % TAU;
				const c0 = corner(i, a0 + TAU * 5/12), c1 = corner(i, a1 + TAU / 12);
				const c2 = corner(i, a0 - TAU * 5/12), c3 = corner(i, a1 - TAU / 12);
				const p0 = vecSub(vecAdd(c0, c1), p), p1 = vecSub(vecAdd(c2, c3), p);
				const about = a => Math.abs(da - a * TAU) < TAU / 12;
				     if (about(0/6)) lineTo(c1);
				else if (about(1/6)) arc(p0, r, -TAU / 4, a0, a1);
				else if (about(2/6)) lineTo(c0);
				else if (about(3/6)) arc(p, r/2, TAU / 4, a0, a1, true);
				else if (about(4/6)) arc(c2, r, TAU / 4, a0, a1, true);
				else if (about(5/6)) arc(p1, r*2, TAU / 4, a0, a1, true);
				else throw "not an angle: " + da;
			}
		};
		halfOfPath();
		points.reverse();
		halfOfPath();
		context.closePath();
	} else arc(hexToVec(start), r/2, 0, 0, TAU);
	fill("#EEE");
	stroke(color);

	const c = angleToVec(vecToAngle(hexToVec(dirs[path.length? path[0]: 2])) + TAU / 4);
	context.beginPath();
	arc(vecAdd(hexToVec(start), vecMul(c, r/5)), r/10, 0, 0, TAU);
	stroke(color);
	context.beginPath();
	arc(vecSub(hexToVec(start), vecMul(c, r/5)), r/10, 0, 0, TAU);
	stroke(color);
};

const player = {trail: [], maxLength: 5};
const spells = [[0, 1], [0, 0, 0], [2, 4]]
	.map((path, i) => ({on: false, len: 0, path, effect: () => console.log("spell " + i)}));

const update = () => {
	const matrix = context.getTransform().inverse();
	const a = vecToHex(matrix.transformPoint(new DOMPoint(input.sx, input.sy)));
	const b = roundHex(hexMul(a, -1 / hexLen(a)));
	player.trail.unshift(dirs.findIndex(dir => hexEql(dir, b)));
	if (player.trail.length >= player.maxLength) player.trail.pop();

	const body = pathWalk(player.trail, hexZero()).slice(1);
	if (body.some(x => hexEql(x, hexZero()))) console.log("crash");
	
	for (const spell of spells) {
		spell.len = Math.max(...spell.path.map((_, i) => i + 1).filter(i => 
			i <= player.trail.length &&
			pathReverse(player.trail.slice(0, i)).every((x, k) => x === spell.path[k])
		));
		if (spell.len === spell.path.length) {
			if (!spell.on) {
				spell.on = true;
				spell.effect();
			}
		} else spell.on = false;
	}
};

const render = () => {
	reset();
	for (const spell of spells)
		drawSnake(pathReverse(spell.path.slice(spell.len)), R / 2, false, "#CCC");
	drawSnake(player.trail, R * 2/3, true, "#111");
};

const loop = () => {
	if (input.pressed) update();
	input.pressed = false;
	render();
	window.requestAnimationFrame(loop);
};
window.requestAnimationFrame(loop);
