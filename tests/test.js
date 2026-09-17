// Behaviour tests. tests/run.sh embeds this file into a copy of index.html and runs it in headless Chromium.
(async () => {
  window.addEventListener("error", e => { document.body.appendChild(document.createTextNode("JSERR " + e.message + " @" + e.lineno)); });
  const out = document.createElement("pre"); out.id = "testout"; document.body.appendChild(out); const log = (...a) => { out.textContent += a.join(" ") + "\n"; };
  const api = window.openposeEditor, cv = document.getElementById("cv");
  const S = () => api.state, V = () => api.view;
  const scr = q => { const r = cv.getBoundingClientRect(); return [q[0] * V().s + V().tx + r.left, q[1] * V().s + V().ty + r.top]; };
  const ev = (type, [x, y], extra = {}) => cv.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, isPrimary: true, button: extra.button ?? 0, buttons: 1, shiftKey: !!extra.shift, ctrlKey: !!extra.ctrl, altKey: !!extra.alt }));
  const drag = (from, to, extra) => { ev("pointerdown", from, extra); ev("pointermove", [(from[0]+to[0])/2,(from[1]+to[1])/2], extra); ev("pointermove", to, extra); ev("pointerup", to, extra); };
  const key = (k, extra = {}) => document.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, ctrlKey: !!extra.ctrl, shiftKey: !!extra.shift }));
  const dist = (a, b) => Math.hypot(a[0]-b[0], a[1]-b[1]);
  const near = (a, b, tol=1.5) => Math.abs(a-b) < tol;
  let pass = 0, fail = 0; const check = (name, ok, info="") => { ok ? pass++ : fail++; log(ok ? "ok  " : "FAIL", name, info); };
  await new Promise(r => setTimeout(r, 300));
  const b0 = JSON.parse(JSON.stringify(S().people[0].body));
  // 1 free mode: drag R elbow (3) by +60,+40 world px; only that joint moves
  const target = [b0[3][0] + 60, b0[3][1] + 40];
  drag(scr(b0[3]), scr(target));
  let b = S().people[0].body;
  check("free: elbow at target", near(b[3][0], target[0]) && near(b[3][1], target[1]), JSON.stringify(b[3]));
  check("free: wrist unchanged", near(b[4][0], b0[4][0]) && near(b[4][1], b0[4][1]));
  api.undo(); b = S().people[0].body; check("undo restores elbow", near(b[3][0], b0[3][0]));
  api.redo(); b = S().people[0].body; check("redo re-applies", near(b[3][0], target[0]));
  api.undo();
  // 2 lock mode: drag elbow; upper-arm and forearm lengths preserved, wrist follows
  document.getElementById("lock").click();
  const L1 = dist(b0[2], b0[3]), L2 = dist(b0[3], b0[4]);
  drag(scr(b0[3]), scr([b0[3][0] + 120, b0[3][1] - 30]));
  b = S().people[0].body;
  check("lock: upper arm length kept", near(dist(b[2], b[3]), L1, 0.5), `${L1.toFixed(1)} -> ${dist(b[2], b[3]).toFixed(1)}`);
  check("lock: forearm length kept", near(dist(b[3], b[4]), L2, 0.5));
  check("lock: wrist moved with elbow", dist(b[4], b0[4]) > 20);
  check("lock: shoulder unchanged", near(b[2][0], b0[2][0]) && near(b[2][1], b0[2][1]));
  api.undo();
  // 3 lock + alt: stretch bone along its axis
  const t3 = [b0[3][0] + (b0[3][0]-b0[2][0]) * 0.5, b0[3][1] + (b0[3][1]-b0[2][1]) * 0.5];
  drag(scr(b0[3]), scr(t3), { alt: true }); b = S().people[0].body;
  check("alt: upper arm stretched ~1.5x", near(dist(b[2], b[3]) / L1, 1.5, 0.05), (dist(b[2], b[3]) / L1).toFixed(3));
  check("alt: forearm length kept", near(dist(b[3], b[4]), L2, 0.5));
  api.undo();
  // 4 lock + ctrl: snap to 15 deg
  drag(scr(b0[3]), scr([b0[2][0] + 100, b0[2][1] + 37]), { ctrl: true }); b = S().people[0].body;
  const ang = Math.atan2(b[3][1]-b[2][1], b[3][0]-b[2][0]) * 180 / Math.PI;
  check("ctrl: angle snapped to 15deg", near(Math.abs(ang % 15), 0, 0.01) || near(Math.abs(ang % 15), 15, 0.01), ang.toFixed(2));
  api.undo();
  // 5 neck drag in lock mode moves whole body
  drag(scr(b0[1]), scr([b0[1][0] + 50, b0[1][1] + 10])); b = S().people[0].body;
  check("lock: neck drag translates all", near(b[10][0], b0[10][0] + 50) && near(b[0][1], b0[0][1] + 10));
  api.undo();
  // 6 symmetric edit
  document.getElementById("sym").click();
  drag(scr(b0[3]), scr([b0[3][0] - 80, b0[3][1] - 20])); b = S().people[0].body;
  check("sym: L elbow mirrored about neck x", near(b[6][0], 2 * b0[1][0] - b[3][0]) && near(b[6][1], b[3][1]), `${b[3]} | ${b[6]}`);
  api.undo(); document.getElementById("sym").click();
  // 7 hands
  document.getElementById("addRHand").click();
  let p = S().people[0];
  check("hand: 21 points", p.rhand && p.rhand.length === 21);
  check("hand: root at wrist", near(p.rhand[0][0], p.body[4][0]) && near(p.rhand[0][1], p.body[4][1]));
  const h0 = JSON.parse(JSON.stringify(p.rhand));
  drag(scr(p.body[3]), scr([p.body[3][0] + 100, p.body[3][1]])); p = S().people[0];
  check("hand: follows wrist in lock mode", near(p.rhand[0][0], p.body[4][0]) && near(p.rhand[0][1], p.body[4][1]) && dist(p.rhand[12], h0[12]) > 20);
  check("hand: finger length kept", near(dist(p.rhand[9], p.rhand[12]), dist(h0[9], h0[12]), 0.5));
  document.getElementById("lock").click();
  // 8 hide via double click, JSON encodes 0,0,0
  const hidden = S().people[0].body[16];
  cv.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, clientX: scr(hidden)[0], clientY: scr(hidden)[1] }));
  const j = api.toJSON();
  check("hidden joint exports 0,0,0", S().people[0].body[16][2] === 0 && j.people[0].pose_keypoints_2d.slice(48, 51).join() === "0,0,0");
  check("json has hand_right", Array.isArray(j.people[0].hand_right_keypoints_2d) && j.people[0].hand_right_keypoints_2d.length === 63);
  // 9 round trip
  api.fromJSON(JSON.parse(JSON.stringify(j)));
  const j2 = api.toJSON();
  check("json round trip identical", JSON.stringify(j) === JSON.stringify(j2));
  // 10 add / duplicate / mirror / delete
  document.getElementById("addPerson").click(); document.getElementById("dupPerson").click();
  check("3 people after add+dup", S().people.length === 3);
  const before = JSON.parse(JSON.stringify(S().people[2].body));
  document.getElementById("mirror").click(); const m = S().people[2].body;
  check("mirror swaps L/R", near(m[2][1], before[5][1]) && m[2][0] < m[5][0] === before[2][0] < before[5][0]);
  document.getElementById("delPerson").click(); check("delete person", S().people.length === 2);
  // 11 whole-person right-drag
  const pb = JSON.parse(JSON.stringify(S().people[0].body));
  drag(scr(pb[8]), scr([pb[8][0] + 30, pb[8][1] + 30]), { button: 2 });
  check("right drag moves person", near(S().people[0].body[0][0], pb[0][0] + 30) && near(S().people[0].body[13][1], pb[13][1] + 30));
  // 12 sliders
  const rot = document.getElementById("rot"); rot.value = 90; rot.dispatchEvent(new Event("input")); rot.dispatchEvent(new Event("change"));
  const rb = S().people[0].body; check("rotate 90: ankle x differs from head x by body height", Math.abs(rb[10][0] - rb[0][0]) > 300, `${rb[0]} ${rb[10]}`);
  api.undo();
  // 13 canvas size scaling
  const cw = document.getElementById("cw"); cw.value = 512; cw.dispatchEvent(new Event("change"));
  check("canvas width 512 scales x", S().w === 512 && S().people[0].body[1][0] < 300);
  // 14 PNG export size and content
  const png = api.renderPNG(); const g = png.getContext("2d"), d = g.getImageData(0, 0, png.width, png.height).data; let nz = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i+1] + d[i+2] > 0) nz++;
  check("png export size", png.width === 512 && png.height === 1024);
  check("png has skeleton pixels", nz > 2000, nz);
  log(`RESULT pass=${pass} fail=${fail}`);
})();
