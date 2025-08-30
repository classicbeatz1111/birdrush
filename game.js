
(() => {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const GRAV = 0.45;
  const FLAP = -7.5;
  const OBSTACLE_GAP = 160;
  const PIPE_W = 100;
  const BASE_SPEED = 2.5;
  const MAX_SPEED = 6.5;
  const BOOST_TIME = 2500; // ms
  const HEART_TIME = 10000; // ms for friend timer
  const SPAWN_RATE = 1800; // ms

  const bgImg = new Image(); bgImg.src = 'assets/background.png';
  const birdImg = new Image(); birdImg.src = 'assets/bird.png';
  const friendImg = new Image(); friendImg.src = 'assets/friend.png';
  const pipeImg = new Image(); pipeImg.src = 'assets/pipe.png';
  const cloudImg = new Image(); cloudImg.src = 'assets/cloud.png';
  const heartImg = new Image(); heartImg.src = 'assets/power_heart.png';
  const boltImg = new Image(); boltImg.src = 'assets/power_bolt.png';

  const music = new Audio('assets/music.wav'); music.loop = true; music.volume = 0.25;

  let state = 'ready'; // ready, playing, paused, gameover
  let last = 0;
  let speed = BASE_SPEED;
  let score = 0;
  let friends = 1;
  let friendTimer = 0;
  let boostTimer = 0;

  const player = { x: 140, y: H/2, vy: 0, w: 60, h: 44 };
  const buddy = { x: 100, y: H/2+20, vy: 0, w: 60, h: 44 };
  const obstacles = [];
  const pickups = []; // {type:'heart'|'bolt', x,y,w,h}

  function reset() {
    state = 'playing';
    speed = BASE_SPEED;
    score = 0;
    friends = 1;
    friendTimer = 0;
    boostTimer = 0;
    player.x = 140; player.y = H/2; player.vy = 0;
    buddy.x = 100; buddy.y = H/2+20; buddy.vy = 0;
    obstacles.length = 0;
    pickups.length = 0;
  }

  function spawnObstacle() {
    const gapY = 120 + Math.random()*(H-240);
    const topH = gapY - OBSTACLE_GAP/2;
    const bottomY = gapY + OBSTACLE_GAP/2;
    obstacles.push({ x: W+20, y: 0, w: PIPE_W, h: topH, type:'pipeTop', passed:false });
    obstacles.push({ x: W+20, y: bottomY, w: PIPE_W, h: H-bottomY, type:'pipeBottom', passed:false });
    // sometimes add cloud
    if (Math.random() < 0.35) {
      const ch = 80, cw = 140;
      obstacles.push({ x: W+120, y: 40+Math.random()*(H-200), w: cw, h: ch, type:'cloud', passed:false });
    }
    // pickups
    if (Math.random() < 0.55) {
      pickups.push({ type: Math.random()<0.6?'heart':'bolt', x: W+50, y: gapY-20, w: 40, h: 40, vy: (Math.random()*0.6-0.3)});
    }
  }

  function rectsCollide(a,b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function flap() {
    if (state === 'ready') {
      reset();
      music.play().catch(()=>{});
    } else if (state === 'playing') {
      player.vy = FLAP;
      if (friends>1) buddy.vy = FLAP*0.9;
    } else if (state === 'gameover') {
      reset();
    }
  }

  canvas.addEventListener('pointerdown', flap);
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') flap();
    if (e.code === 'KeyP') togglePause();
  });

  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const scoreEl = document.getElementById('score');
  const friendsEl = document.getElementById('friends');
  const speedEl = document.getElementById('speed');

  btnStart.onclick = () => {
    if (state !== 'playing') { reset(); music.play().catch(()=>{}); }
  };
  function togglePause(){
    if (state === 'playing') { state='paused'; music.pause(); }
    else if (state === 'paused') { state='playing'; music.play().catch(()=>{}); last=performance.now(); }
  }
  btnPause.onclick = togglePause;

  let spawnAcc = 0;

  function update(dt) {
    if (state !== 'playing') return;

    // spawn
    spawnAcc += dt;
    if (spawnAcc > SPAWN_RATE) {
      spawnAcc = 0;
      spawnObstacle();
    }

    // gravity
    player.vy += GRAV;
    player.y += player.vy;

    if (friends>1) {
      // buddy trails slightly
      buddy.vy += GRAV*0.95;
      buddy.y += buddy.vy;
      buddy.y += (player.y - buddy.y)*0.05;
      friendTimer -= dt;
      if (friendTimer <= 0) {
        friends = 1;
      }
    }

    // move world
    const s = speed + (boostTimer>0 ? 2.0 : 0);
    obstacles.forEach(o => { o.x -= s; });
    pickups.forEach(p => { p.x -= s; p.y += p.vy*2; });

    // collisions
    const playerRect = { x: player.x-20, y: player.y-20, w: 40, h: 40 };
    for (const o of obstacles) {
      const rect = { x:o.x, y:o.y, w:o.w, h:o.h };
      if (rectsCollide(playerRect, rect)) {
        state = 'gameover'; music.pause();
      } else if (!o.passed && o.type==='pipeTop' && o.x + o.w < player.x) {
        o.passed = true;
        score++;
      }
    }

    // pickups
    for (let i=pickups.length-1; i>=0; i--) {
      const p = pickups[i];
      const rect = { x:p.x, y:p.y, w:p.w, h:p.h };
      if (rectsCollide(playerRect, rect)) {
        if (p.type==='heart') {
          friends = Math.min(2, friends+1);
          friendTimer = HEART_TIME;
          // small heal/score
          score += 2;
        } else if (p.type==='bolt') {
          boostTimer = BOOST_TIME;
          speed = Math.min(MAX_SPEED, speed + 0.25);
          score += 1;
        }
        pickups.splice(i,1);
      } else if (p.x < -60) {
        pickups.splice(i,1);
      }
    }

    // bounds
    if (player.y < -40 || player.y > H-20) { state='gameover'; music.pause(); }

    // timers
    if (boostTimer>0) boostTimer -= dt;

    // update UI
    scoreEl.textContent = String(score);
    friendsEl.textContent = String(friends);
    speedEl.textContent = (speed + (boostTimer>0?2.0:0)).toFixed(1);

    // cleanup
    for (let i=obstacles.length-1; i>=0; i--) {
      if (obstacles[i].x < -200) obstacles.splice(i,1);
    }
  }

  function draw() {
    // background
    ctx.drawImage(bgImg, 0,0, W, H);

    // obstacles
    for (const o of obstacles) {
      if (o.type==='cloud') ctx.drawImage(cloudImg, o.x, o.y, o.w, o.h);
      else {
        // draw pipes stretched
        ctx.drawImage(pipeImg, o.x, o.y, o.w, o.h);
      }
    }

    // pickups
    for (const p of pickups) {
      const img = p.type==='heart'? heartImg : boltImg;
      ctx.drawImage(img, p.x, p.y, p.w, p.h);
    }

    // birds
    ctx.drawImage(birdImg, player.x-40, player.y-30, 80,60);
    if (friends>1) ctx.drawImage(friendImg, buddy.x-40, buddy.y-30, 80,60);

    if (state === 'ready') {
      banner("Tap/Space to start");
    } else if (state === 'paused') {
      banner("Paused");
    } else if (state === 'gameover') {
      banner("Game Over - Tap to restart");
    }
  }

  function banner(text) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#000';
    ctx.fillRect(W*0.15, H*0.35, W*0.7, 80);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff';
    ctx.font = '28px system-ui, Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, W/2, H*0.35+50);
    ctx.restore();
  }

  function loop(ts) {
    if (!last) last = ts;
    const dt = Math.min(34, ts-last);
    last = ts;
    update(dt);
    ctx.clearRect(0,0,W,H);
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
