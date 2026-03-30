const BOARD_WIDTH = 800;
const BOARD_HEIGHT = 600;

const gameBoard = document.getElementById('game-board');
const moneyEl = document.getElementById('money');
const livesEl = document.getElementById('lives');
const waveEl = document.getElementById('wave');
const startWaveBtn = document.getElementById('start-wave');
const towerButtons = document.querySelectorAll('.tower-button');

// Game State
let money = 200;
let lives = 20;
let wave = 1;
let state = 'idle'; // idle, playing, over
let enemies = [];
let projectiles = [];
let towers = [];
let currentTowerSelection = 'pointer';
let selectedTowerSpot = null;

const XP_THRESHOLDS = [0, 500, 1500, 3000, 6000];

const towerPopup = document.getElementById('tower-popup');
const popupTitle = document.getElementById('popup-title');
const popupLevel = document.getElementById('popup-level');
const popupDamage = document.getElementById('popup-damage');
const popupRange = document.getElementById('popup-range');
const popupFirerate = document.getElementById('popup-firerate');
const popupTotalDmg = document.getElementById('popup-total-dmg');
const popupXpBar = document.getElementById('popup-xp-bar');
const popupXpCurrent = document.getElementById('popup-xp-current');
const popupXpNext = document.getElementById('popup-xp-next');
const popupSellPrice = document.getElementById('popup-sell-price');
const btnSell = document.getElementById('btn-sell');
const btnClosePopup = document.getElementById('btn-close-popup');

btnClosePopup.addEventListener('click', hideTowerPopup);
btnSell.addEventListener('click', sellTower);

gameBoard.addEventListener('click', (e) => {
    if (e.target === gameBoard) hideTowerPopup();
});

function hideTowerPopup() {
    towerPopup.classList.add('hidden');
    selectedTowerSpot = null;
}

function showTowerPopup(spot) {
    selectedTowerSpot = spot;
    updatePopupUIIfSelected(spot.tower);
    towerPopup.classList.remove('hidden');
}

function updatePopupUIIfSelected(tower) {
    if (!selectedTowerSpot || selectedTowerSpot.tower !== tower) return;
    
    popupTitle.textContent = tower.type.charAt(0).toUpperCase() + tower.type.slice(1) + ' Tower';
    popupLevel.textContent = tower.level;
    popupDamage.textContent = tower.damage;
    popupRange.textContent = tower.range;
    popupFirerate.textContent = (tower.fireRate / 1000).toFixed(2);
    popupTotalDmg.textContent = Math.floor(tower.totalDamage);
    popupSellPrice.textContent = Math.floor(tower.cost * 0.5);
    
    updatePopupXPBar(tower);
}

function updatePopupXPBar(tower) {
    popupXpCurrent.textContent = Math.floor(tower.totalDamage);
    const nextXp = XP_THRESHOLDS[tower.level];
    if (nextXp) {
        popupXpNext.textContent = nextXp;
        const prevXp = XP_THRESHOLDS[tower.level - 1];
        const progress = Math.max(0, (tower.totalDamage - prevXp) / (nextXp - prevXp));
        popupXpBar.style.width = (progress * 100) + '%';
    } else {
        popupXpNext.textContent = 'MAX';
        popupXpBar.style.width = '100%';
    }
}

function sellTower() {
    if (selectedTowerSpot && selectedTowerSpot.tower) {
        const tower = selectedTowerSpot.tower;
        money += Math.floor(tower.cost * 0.5);
        
        const idx = towers.indexOf(tower);
        if (idx > -1) towers.splice(idx, 1);
        
        selectedTowerSpot.el.innerHTML = '';
        selectedTowerSpot.el.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        selectedTowerSpot.tower = null;
        
        updateUI();
        hideTowerPopup();
    }
}

let lastTime = 0;
let spawnTimer = 0;
let enemiesToSpawn = 0;
let enemySpawnInterval = 1000;

// Update UI
function updateUI() {
    moneyEl.textContent = money;
    livesEl.textContent = lives;
    waveEl.textContent = wave;
}

// Complex looping path
const path = [
    {x: -40, y: 100},
    {x: 650, y: 100},
    {x: 650, y: 250},
    {x: 150, y: 250},
    {x: 150, y: 450},
    {x: 650, y: 450},
    {x: 650, y: 550},
    {x: 400, y: 550},
    {x: 400, y: 350} // Base in the middle
];

// Tower Spots positioned strategically around path
const towerSpots = [
    {x: 200, y: 175},
    {x: 350, y: 175},
    {x: 500, y: 175},
    
    {x: 250, y: 350},
    {x: 550, y: 350},
    {x: 100, y: 350},

    {x: 200, y: 500},
    {x: 350, y: 500},
    {x: 500, y: 500},
];

const towerTypes = {
    basic: { cost: 50, range: 140, damage: 30, fireRate: 800, color: '#58a6ff', type: 'basic' },
    sniper: { cost: 100, range: 250, damage: 100, fireRate: 2000, color: '#bc8cff', type: 'sniper' },
    ray: { cost: 150, range: 200, damage: 15, fireRate: 1500, color: '#ff5e00', type: 'ray' }
};

// Initialization
function init() {
    drawPath();
    drawTowerSpots();
    drawBase();
    updateUI();
    requestAnimationFrame(gameLoop);
}

function drawPath() {
    for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i+1];
        
        const segment = document.createElement('div');
        segment.className = 'path-segment';
        
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const length = Math.sqrt(dx*dx + dy*dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        segment.style.width = length + 'px';
        segment.style.left = p1.x + 'px';
        segment.style.top = p1.y + 'px';
        segment.style.transform = `rotate(${angle}deg)`;
        
        gameBoard.appendChild(segment);
    }
}

function drawTowerSpots() {
    towerSpots.forEach((spot, index) => {
        const spotEl = document.createElement('div');
        spotEl.className = 'tower-spot';
        spotEl.style.left = spot.x + 'px';
        spotEl.style.top = spot.y + 'px';
        spotEl.dataset.index = index;

        // Range indicator
        const rangeEl = document.createElement('div');
        rangeEl.className = 'tower-range';
        rangeEl.style.left = spot.x + 'px';
        rangeEl.style.top = spot.y + 'px';
        rangeEl.style.display = 'none';
        gameBoard.appendChild(rangeEl);

        spotEl.addEventListener('mouseenter', () => {
             if (currentTowerSelection !== 'pointer' && !spot.tower) {
                 const range = towerTypes[currentTowerSelection].range;
                 rangeEl.style.width = (range * 2) + 'px';
                 rangeEl.style.height = (range * 2) + 'px';
                 rangeEl.style.display = 'block';
             }
        });

        spotEl.addEventListener('mouseleave', () => {
             if (!spot.tower) {
                 rangeEl.style.display = 'none';
             }
        });
        
        spot.el = spotEl;
        
        spotEl.addEventListener('click', (e) => {
            if (spot.tower) {
                e.stopPropagation();
                showTowerPopup(spot);
            } else if (currentTowerSelection !== 'pointer') {
                const type = currentTowerSelection;
                const towerData = towerTypes[type];
                
                if (money >= towerData.cost) {
                    money -= towerData.cost;
                    updateUI();
                    
                    const towerEl = document.createElement('div');
                    towerEl.className = `tower ${type}`;
                    towerEl.style.left = '50%';
                    towerEl.style.top = '50%';
                    
                    const levelIndicator = document.createElement('div');
                    levelIndicator.className = 'tower-level';
                    levelIndicator.textContent = 'Lvl 1';
                    towerEl.appendChild(levelIndicator);
                    
                    spotEl.appendChild(towerEl);
                    spotEl.style.borderColor = towerData.color;
                    
                    spot.tower = {
                        type: type,
                        ...towerData,
                        lastFired: 0,
                        totalDamage: 0, // Track damage
                        level: 1,
                        levelEl: levelIndicator,
                        x: spot.x,
                        y: spot.y
                    };
                    towers.push(spot.tower);
                    
                    rangeEl.style.display = 'none'; 
                    currentTowerSelection = 'pointer';
                    updateSelectionUI();
                    hideTowerPopup();
                }
            }
        });
        
        gameBoard.appendChild(spotEl);
    });
}

function drawBase() {
    const base = document.getElementById('base');
    const lastPoint = path[path.length - 1];
    base.style.left = lastPoint.x + 'px';
    base.style.top = lastPoint.y + 'px';
}

function updateSelectionUI() {
    towerButtons.forEach(btn => {
        if (btn.dataset.type === currentTowerSelection) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });

    document.querySelectorAll('.tower-range').forEach(el => el.style.display = 'none');
}

towerButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        currentTowerSelection = btn.dataset.type;
        updateSelectionUI();
    });
});

startWaveBtn.addEventListener('click', () => {
    if (state === 'idle') {
        state = 'playing';
        enemiesToSpawn = 8 + wave * 3;
        enemySpawnInterval = Math.max(400, 1200 - wave * 100);
        spawnTimer = enemySpawnInterval; // spawn first immediately
        startWaveBtn.disabled = true;
    }
});

function spawnEnemy() {
    const isTriangle = Math.random() > 0.4;
    const type = isTriangle ? 'triangle' : 'square';
    
    // Wave multipliers
    const waveMult = Math.pow(1.2, wave - 1);
    
    const maxHealth = Math.floor((isTriangle ? 40 : 100) * waveMult);
    const speed = (isTriangle ? 140 : 80) + (wave * 2);
    const reward = isTriangle ? 5 : 10;
    
    const el = document.createElement('div');
    el.className = `enemy`;
    
    const healthContainer = document.createElement('div');
    healthContainer.className = 'health-bar-container';
    const healthBar = document.createElement('div');
    healthBar.className = 'health-bar';
    healthContainer.appendChild(healthBar);
    
    const shape = document.createElement('div');
    shape.className = `shape ${type}`;
    
    el.appendChild(healthContainer);
    el.appendChild(shape);
    
    el.style.left = path[0].x + 'px';
    el.style.top = path[0].y + 'px';
    gameBoard.appendChild(el);
    
    enemies.push({
        el,
        shapeEl: shape,
        healthBar,
        x: path[0].x,
        y: path[0].y,
        pathIndex: 0,
        health: maxHealth,
        maxHealth: maxHealth,
        speed: speed,
        reward: reward,
        type: type,
        speedMod: 1, 
    });
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2)**2 + (y1 - y2)**2);
}

function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1); 
    const dtMs = timestamp - lastTime;
    lastTime = timestamp;
    
    if (state === 'playing') {
        spawnTimer += dtMs;
        if (spawnTimer >= enemySpawnInterval && enemiesToSpawn > 0) {
            spawnEnemy();
            enemiesToSpawn--;
            spawnTimer -= enemySpawnInterval;
        }
    }
    
    updateEnemies(dt);
    updateTowers(timestamp);
    updateProjectiles(dt);
    
    if (state === 'playing' && enemiesToSpawn === 0 && enemies.length === 0) {
        state = 'idle';
        wave++;
        updateUI();
        startWaveBtn.disabled = false;
        startWaveBtn.textContent = `Start Wave ${wave}`;
        money += 30 + wave * 10; 
        updateUI();
    }
    
    if (lives <= 0 && state !== 'over') {
        state = 'over';
        alert(`Game Over! You reached Wave ${wave}.`);
        location.reload();
        return;
    }
    
    requestAnimationFrame(gameLoop);
}

function updateEnemies(dt) {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const targetPoint = path[enemy.pathIndex + 1];
        
        if (!targetPoint) {
            lives--;
            updateUI();
            enemy.el.remove();
            enemies.splice(i, 1);
            
            const base = document.getElementById('base');
            base.style.transform = 'translate(-50%, -50%) scale(1.2)';
            base.style.backgroundColor = '#f85149';
            setTimeout(() => {
                base.style.transform = 'translate(-50%, -50%) scale(1)';
                base.style.backgroundColor = 'var(--base-color)';
            }, 100);
            
            continue;
        }
        
        const dx = targetPoint.x - enemy.x;
        const dy = targetPoint.y - enemy.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        const moveDist = enemy.speed * enemy.speedMod * dt;
        
        if (moveDist >= dist) {
            enemy.x = targetPoint.x;
            enemy.y = targetPoint.y;
            enemy.pathIndex++;
        } else {
            enemy.x += (dx / dist) * moveDist;
            enemy.y += (dy / dist) * moveDist;
        }
        
        if (enemy.type === 'triangle') {
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            enemy.shapeEl.style.transform = `rotate(${angle + 90}deg)`;
        }
        
        enemy.el.style.left = enemy.x + 'px';
        enemy.el.style.top = enemy.y + 'px';
    }
}

function updateTowers(timestamp) {
    towers.forEach(tower => {
         if (timestamp - tower.lastFired >= tower.fireRate) {
            let target = null;
            let maxPathDist = -1;
            
            for (const enemy of enemies) {
                const dist = distance(tower.x, tower.y, enemy.x, enemy.y);
                if (dist <= tower.range) {
                    const pathDist = enemy.pathIndex * 1000 + (1000 - distance(enemy.x, enemy.y, path[enemy.pathIndex+1]?.x || enemy.x, path[enemy.pathIndex+1]?.y || enemy.y));
                    if (pathDist > maxPathDist) {
                        maxPathDist = pathDist;
                        target = enemy;
                    }
                }
            }
            
            if (target) {
                if (tower.type === 'ray') {
                    fireRay(tower, target);
                } else {
                    fireProjectile(tower, target);
                }
                tower.lastFired = timestamp;
                
                const towerEl = document.querySelector(`.tower-spot[style*="left: ${tower.x}px"][style*="top: ${tower.y}px"] .tower`);
                if (towerEl) {
                    towerEl.style.transform = 'translate(-50%, -50%) scale(1.2)';
                    setTimeout(() => {
                         if (towerEl) towerEl.style.transform = 'translate(-50%, -50%) scale(1)';
                    }, 100);
                }
            }
        }
    });
}

function fireProjectile(tower, target) {
    const el = document.createElement('div');
    el.className = 'projectile';
    el.style.left = tower.x + 'px';
    el.style.top = tower.y + 'px';
    el.style.backgroundColor = tower.color;
    el.style.boxShadow = `0 0 8px ${tower.color}`;
    gameBoard.appendChild(el);
    
    projectiles.push({
        el,
        x: tower.x,
        y: tower.y,
        target: target,
        damage: tower.damage,
        towerInfo: tower,
        speed: 500
    });
}

function dist2(v, w) { return (v.x - w.x)**2 + (v.y - w.y)**2; }
function distToSegmentSquared(v, w, p) {
  const l2 = dist2(v, w);
  if (l2 === 0) return dist2(p, v);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist2(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
}

function fireRay(tower, target) {
    const dx = target.x - tower.x;
    const dy = target.y - tower.y;
    const angle = Math.atan2(dy, dx);
    const length = tower.range;
    
    const beam = document.createElement('div');
    beam.className = 'beam';
    beam.style.left = tower.x + 'px';
    beam.style.top = tower.y + 'px';
    beam.style.width = length + 'px';
    beam.style.transform = `translate(0, -50%) rotate(${angle * 180 / Math.PI}deg)`;
    gameBoard.appendChild(beam);
    
    setTimeout(() => {
        beam.style.opacity = '0';
        setTimeout(() => beam.remove(), 200);
    }, 50);

    const p1x = tower.x;
    const p1y = tower.y;
    const p2x = tower.x + length * Math.cos(angle);
    const p2y = tower.y + length * Math.sin(angle);
    
    const hitRadius = 25;

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        const distSq = distToSegmentSquared({x: p1x, y: p1y}, {x: p2x, y: p2y}, {x: enemy.x, y: enemy.y});
        
        if (Math.sqrt(distSq) <= hitRadius) {
            applyDamage(enemy, tower.damage, tower);
        }
    }
}

function applyDamage(enemy, damage, tower) {
    enemy.health -= damage;
    tower.totalDamage += damage;
    
    const oldLevel = tower.level;
    let nextXp = XP_THRESHOLDS[tower.level];
    
    while (nextXp && tower.totalDamage >= nextXp) {
        tower.level++;
        tower.damage = Math.floor(tower.damage * 1.25);
        tower.range = Math.floor(tower.range * 1.05);
        tower.fireRate = Math.max(200, Math.floor(tower.fireRate * 0.90));
        nextXp = XP_THRESHOLDS[tower.level];
    }
    
    if (tower.level > oldLevel) {
        tower.levelEl.textContent = `Lvl ${tower.level}`;
        tower.levelEl.style.transform = 'scale(1.5)';
        setTimeout(() => { if (tower.levelEl) tower.levelEl.style.transform = 'scale(1)'; }, 200);
        const towerEl = tower.levelEl.parentElement;
        if (towerEl) {
            towerEl.style.boxShadow = `0 0 30px ${tower.color}`;
            setTimeout(() => { if(towerEl) towerEl.style.boxShadow = `0 0 15px ${tower.color}`; }, 300);
        }
    }
    
    if (selectedTowerSpot && selectedTowerSpot.tower === tower) {
        if (tower.level > oldLevel) {
            updatePopupUIIfSelected(tower);
        } else {
            updatePopupXPBar(tower);
            popupTotalDmg.textContent = Math.floor(tower.totalDamage);
        }
    }
    
    const hpPercent = Math.max(0, enemy.health / enemy.maxHealth);
    enemy.healthBar.style.width = (hpPercent * 100) + '%';
    if (hpPercent < 0.3) {
        enemy.healthBar.style.backgroundColor = '#f85149';
    } else if (hpPercent < 0.6) {
        enemy.healthBar.style.backgroundColor = '#d29922';
    }
    
    if (enemy.shapeEl) {
        enemy.shapeEl.style.filter = 'brightness(2) drop-shadow(0 0 10px white)';
        setTimeout(() => {
            if(enemy.shapeEl) enemy.shapeEl.style.filter = enemy.type === 'triangle' ? 'drop-shadow(0 0 8px var(--triangle-enemy))' : '';
        }, 50);
    }
    
    if (enemy.health <= 0) {
        enemy.el.remove();
        const index = enemies.indexOf(enemy);
        if (index > -1) enemies.splice(index, 1);
        money += enemy.reward;
        updateUI();
    }
}

function updateProjectiles(dt) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];
        const targetRef = proj.target;
        
        if (!enemies.includes(targetRef)) {
            proj.el.remove();
            projectiles.splice(i, 1);
            continue;
        }
        
        const dx = targetRef.x - proj.x;
        const dy = targetRef.y - proj.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        const moveDist = proj.speed * dt;
        
        if (moveDist >= dist) {
            applyDamage(targetRef, proj.damage, proj.towerInfo);
            proj.el.remove();
            projectiles.splice(i, 1);
        } else {
            proj.x += (dx / dist) * moveDist;
            proj.y += (dy / dist) * moveDist;
            proj.el.style.left = proj.x + 'px';
            proj.el.style.top = proj.y + 'px';
        }
    }
}

init();
