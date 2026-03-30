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
let selectedEmptySpot = null;

const spells = {
    meteor: { cd: 15000, lastUsed: -15000, radius: 150, damage: 300 },
    freeze: { cd: 30000, lastUsed: -30000, duration: 5000, active: false }
};
let currentSpellSelection = null;

const XP_THRESHOLDS = [0, 500, 1500, 3000, 6000];

const buildPopup = document.getElementById('build-popup');
const btnCloseBuild = document.getElementById('btn-close-build');

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

const meteorIndicator = document.createElement('div');
meteorIndicator.className = 'meteor-indicator';
gameBoard.appendChild(meteorIndicator);

gameBoard.addEventListener('mousemove', (e) => {
    if (currentSpellSelection === 'meteor') {
        const rect = gameBoard.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        meteorIndicator.style.left = x + 'px';
        meteorIndicator.style.top = y + 'px';
    }
});

gameBoard.addEventListener('mouseleave', () => {
    meteorIndicator.style.display = 'none';
});

gameBoard.addEventListener('click', (e) => {
    if (currentSpellSelection === 'meteor') {
        const rect = gameBoard.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const radius = spells.meteor.radius;
        const explosion = document.createElement('div');
        explosion.className = 'explosion';
        explosion.style.left = x + 'px';
        explosion.style.top = y + 'px';
        explosion.style.width = (radius * 2) + 'px';
        explosion.style.height = (radius * 2) + 'px';
        explosion.style.background = 'radial-gradient(circle, rgba(248, 81, 73, 0.8) 0%, transparent 70%)';
        gameBoard.appendChild(explosion);
        
        requestAnimationFrame(() => {
            explosion.style.transform = 'translate(-50%, -50%) scale(1)';
            setTimeout(() => {
                explosion.style.opacity = '0';
                setTimeout(() => explosion.remove(), 300);
            }, 200);
        });
        
        const mockTower = { type: 'meteor', totalDamage: 0, level: 1, levelEl: document.createElement('div'), color: 'transparent' };
        for (let i = enemies.length - 1; i >= 0; i--) {
            const enemy = enemies[i];
            if (distance(x, y, enemy.x, enemy.y) <= radius) {
                applyDamage(enemy, spells.meteor.damage, mockTower);
            }
        }
        
        spells.meteor.lastUsed = performance.now();
        currentSpellSelection = null;
        meteorIndicator.style.display = 'none';
        document.getElementById('btn-spell-meteor').classList.remove('selected');
        return;
    }

    if (e.target === gameBoard) {
        hideTowerPopup();
        hideBuildPopup();
    }
});

function hideBuildPopup() {
    buildPopup.classList.add('hidden');
    if (selectedEmptySpot && selectedEmptySpot.rangeEl) selectedEmptySpot.rangeEl.style.display = 'none';
    selectedEmptySpot = null;
}

function showBuildPopup(spot) {
    if (selectedTowerSpot) hideTowerPopup();
    
    selectedEmptySpot = spot;
    buildPopup.style.left = spot.x + 'px';
    buildPopup.style.top = spot.y + 'px';
    buildPopup.classList.remove('hidden');
    
    if (spot.rangeEl) spot.rangeEl.style.display = 'none';
}

btnCloseBuild.addEventListener('click', (e) => {
    e.stopPropagation();
    hideBuildPopup();
});

document.querySelectorAll('.build-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = btn.dataset.type;
        const towerData = towerTypes[type];
        
        if (money >= towerData.cost && selectedEmptySpot) {
            money -= towerData.cost;
            updateUI();
            
            const spotEl = selectedEmptySpot.el;
            const towerEl = document.createElement('div');
            towerEl.className = `tower ${type}`;
            towerEl.style.left = '50%';
            towerEl.style.top = '50%';
            
            const levelIndicator = document.createElement('div');
            levelIndicator.className = 'tower-level';
            levelIndicator.textContent = '★';
            towerEl.appendChild(levelIndicator);
            
            spotEl.appendChild(towerEl);
            spotEl.style.borderColor = towerData.color;
            
            selectedEmptySpot.tower = {
                type: type,
                ...towerData,
                lastFired: 0,
                totalDamage: 0,
                level: 1,
                levelEl: levelIndicator,
                x: selectedEmptySpot.x,
                y: selectedEmptySpot.y
            };
            towers.push(selectedEmptySpot.tower);
            
            if (selectedEmptySpot.rangeEl) selectedEmptySpot.rangeEl.style.display = 'none';
            hideBuildPopup();
        } else if (money < towerData.cost) {
            alert("Not enough money!"); // Simple feedback
        }
    });
});

function hideTowerPopup() {
    if (selectedTowerSpot && selectedTowerSpot.rangeEl) selectedTowerSpot.rangeEl.style.display = 'none';
    towerPopup.classList.add('hidden');
    selectedTowerSpot = null;
}

function showTowerPopup(spot) {
    if (selectedTowerSpot && selectedTowerSpot.rangeEl) selectedTowerSpot.rangeEl.style.display = 'none';
    selectedTowerSpot = spot;
    updatePopupUIIfSelected(spot.tower);
    towerPopup.classList.remove('hidden');
    if (spot.rangeEl && spot.tower) {
        spot.rangeEl.style.width = (spot.tower.range * 2) + 'px';
        spot.rangeEl.style.height = (spot.tower.range * 2) + 'px';
        spot.rangeEl.style.display = 'block';
    }
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
    bomb: { cost: 150, range: 180, damage: 45, fireRate: 2500, color: '#ffaa00', type: 'bomb', aoe: 90 },
    frost: { cost: 100, range: 150, damage: 10, fireRate: 1500, color: '#00d2ff', type: 'frost' }
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
        spot.rangeEl = rangeEl;

        spotEl.addEventListener('mouseenter', () => {
        });

        spotEl.addEventListener('mouseleave', () => {
             if (!spot.tower || selectedTowerSpot !== spot) {
                 rangeEl.style.display = 'none';
             }
        });
        
        spot.el = spotEl;
        
        spotEl.addEventListener('click', (e) => {
            e.stopPropagation();
            if (spot.tower) {
                hideBuildPopup();
                showTowerPopup(spot);
            } else {
                hideTowerPopup();
                showBuildPopup(spot);
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

// Side panel handlers removed due to QOL update

document.getElementById('btn-spell-freeze').addEventListener('click', () => {
    const now = performance.now();
    if (now - spells.freeze.lastUsed >= spells.freeze.cd) {
        spells.freeze.lastUsed = now;
        spells.freeze.active = true;
        gameBoard.classList.add('frozen');
    }
});

document.getElementById('btn-spell-meteor').addEventListener('click', () => {
    const now = performance.now();
    if (now - spells.meteor.lastUsed >= spells.meteor.cd) {
        if (currentSpellSelection === 'meteor') {
            currentSpellSelection = null;
            document.getElementById('btn-spell-meteor').classList.remove('selected');
            meteorIndicator.style.display = 'none';
        } else {
            currentSpellSelection = 'meteor';
            document.getElementById('btn-spell-meteor').classList.add('selected');
            meteorIndicator.style.display = 'block';
        }
    }
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
    let isBoss = false;
    let type = '';
    
    if (wave % 10 === 0 && enemiesToSpawn === 1) {
        isBoss = true;
        type = 'pentagon';
    } else {
        const rand = Math.random();
        if (rand > 0.7) type = 'armored';
        else if (rand > 0.3) type = 'triangle';
        else type = 'square';
    }
    
    const waveMult = Math.pow(1.2, wave - 1);
    
    const maxHealth = isBoss ? Math.floor(1000 * waveMult) : Math.floor((type === 'armored' ? 150 : type === 'triangle' ? 40 : 100) * waveMult);
    const speed = isBoss ? 50 + wave : (type === 'armored' ? 60 : type === 'triangle' ? 140 : 80) + (wave * 2);
    const reward = isBoss ? 100 : (type === 'armored' ? 15 : type === 'triangle' ? 5 : 10);
    
    const el = document.createElement('div');
    el.className = `enemy`;
    if (isBoss) el.classList.add('boss');
    
    const healthContainer = document.createElement('div');
    healthContainer.className = 'health-bar-container';
    const healthBar = document.createElement('div');
    healthBar.className = 'health-bar';
    healthContainer.appendChild(healthBar);
    
    const shape = document.createElement('div');
    shape.className = `shape ${type}`;
    
    el.appendChild(healthContainer);
    el.appendChild(shape);
    
    if (isBoss) {
        const aura = document.createElement('div');
        aura.className = 'boss-aura';
        el.appendChild(aura);
    }
    
    el.style.left = path[0].x + 'px';
    el.style.top = path[0].y + 'px';
    gameBoard.appendChild(el);
    
    enemies.push({
        el,
        shapeEl: shape,
        healthBar,
        healthBarContainer: healthContainer,
        x: path[0].x,
        y: path[0].y,
        pathIndex: 0,
        health: maxHealth,
        maxHealth: maxHealth,
        speed: speed,
        reward: reward,
        type: type,
        isBoss: isBoss,
        speedMod: 1, 
        slowTimer: 0
    });
}

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2)**2 + (y1 - y2)**2);
}

function predictTargetPosition(tower, enemy, projSpeed) {
    const dist = distance(tower.x, tower.y, enemy.x, enemy.y);
    const timeToHit = dist / projSpeed;
    let travelDist = enemy.speed * enemy.speedMod * timeToHit;
    
    let curX = enemy.x;
    let curY = enemy.y;
    let pathIdx = enemy.pathIndex;
    
    while (travelDist > 0 && pathIdx < path.length - 1) {
        const p2 = path[pathIdx + 1];
        const segDist = distance(curX, curY, p2.x, p2.y);
        
        if (travelDist > segDist) {
            travelDist -= segDist;
            curX = p2.x;
            curY = p2.y;
            pathIdx++;
        } else {
            const dx = p2.x - curX;
            const dy = p2.y - curY;
            curX += (dx / segDist) * travelDist;
            curY += (dy / segDist) * travelDist;
            travelDist = 0;
        }
    }
    return { x: curX, y: curY };
}

function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1); 
    const dtMs = timestamp - lastTime;
    lastTime = timestamp;
    
    // Spells state updates
    if (spells.freeze.active && timestamp - spells.freeze.lastUsed >= spells.freeze.duration) {
        spells.freeze.active = false;
        gameBoard.classList.remove('frozen');
    }
    
    const meteorProgress = Math.max(0, 100 - ((timestamp - spells.meteor.lastUsed) / spells.meteor.cd) * 100);
    document.getElementById('cd-meteor').style.height = meteorProgress + '%';
    
    const freezeProgress = Math.max(0, 100 - ((timestamp - spells.freeze.lastUsed) / spells.freeze.cd) * 100);
    document.getElementById('cd-freeze').style.height = freezeProgress + '%';
    
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
    if (spells.freeze.active) {
        for (const enemy of enemies) enemy.speedMod = 0;
    } else {
        for (const enemy of enemies) {
            if (enemy.slowTimer > 0) {
                enemy.slowTimer -= dt;
                enemy.speedMod = 0.5;
            } else {
                enemy.speedMod = 1;
            }
        }
        
        for (const boss of enemies) {
            if (boss.isBoss) {
                const auraRadius = 150;
                for (const enemy of enemies) {
                    if (!enemy.isBoss && distance(boss.x, boss.y, enemy.x, enemy.y) <= auraRadius) {
                        enemy.speedMod = 1.6;
                    }
                }
            }
        }
    }
    
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
                fireProjectile(tower, target);
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
    
    let speed = 500;
    let isTracking = true;
    let targetX = target.x;
    let targetY = target.y;

    if (tower.type === 'bomb') {
        speed = 200;
        isTracking = false;
        const predicted = predictTargetPosition(tower, target, speed);
        targetX = predicted.x;
        targetY = predicted.y;
        
        el.style.width = '12px';
        el.style.height = '12px';
    } else if (tower.type === 'sniper') {
        speed = 800;
    }
    
    gameBoard.appendChild(el);
    
    projectiles.push({
        el,
        x: tower.x,
        y: tower.y,
        target: target,
        targetX: targetX,
        targetY: targetY,
        isTracking: isTracking,
        damage: tower.damage,
        towerInfo: tower,
        speed: speed
    });
}

function applyDamage(enemy, damage, tower) {
    if (enemy.type === 'armored' && (tower.type === 'basic' || tower.type === 'sniper')) {
        damage = Math.ceil(damage * 0.5);
    }
    
    enemy.health -= damage;
    tower.totalDamage += damage;
    
    if (tower.type === 'frost') {
        enemy.slowTimer = 3;
    }
    
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
        tower.levelEl.textContent = '★'.repeat(Math.min(5, tower.level));
        tower.levelEl.style.transform = 'scale(1.5)';
        setTimeout(() => { if (tower.levelEl) tower.levelEl.style.transform = 'scale(1)'; }, 200);
        
        const floatTxt = document.createElement('div');
        floatTxt.className = 'floating-text';
        floatTxt.textContent = 'Level Up!';
        floatTxt.style.left = tower.x + 'px';
        floatTxt.style.top = (tower.y - 20) + 'px';
        gameBoard.appendChild(floatTxt);
        setTimeout(() => floatTxt.remove(), 1000);
        
        const towerEl = tower.levelEl.parentElement;
        if (towerEl) {
            const scale = 1 + (tower.level - 1) * 0.15;
            towerEl.style.width = (26 * scale) + 'px';
            towerEl.style.height = (26 * scale) + 'px';
            towerEl.style.boxShadow = `0 0 ${15 + tower.level * 5}px ${tower.color}`;
            setTimeout(() => { if(towerEl) towerEl.style.boxShadow = `0 0 ${10 + tower.level * 2}px ${tower.color}`; }, 300);
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
    if (enemy.health < enemy.maxHealth) {
        enemy.healthBarContainer.classList.add('visible');
    }
    
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
        
        if (proj.isTracking && enemies.includes(proj.target)) {
            proj.targetX = proj.target.x;
            proj.targetY = proj.target.y;
        }
        
        const dx = proj.targetX - proj.x;
        const dy = proj.targetY - proj.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        const moveDist = proj.speed * dt;
        
        if (moveDist >= dist) {
            if (proj.towerInfo.type === 'bomb') {
                const ex = proj.targetX;
                const ey = proj.targetY;
                const radius = proj.towerInfo.aoe;
                
                const explosion = document.createElement('div');
                explosion.className = 'explosion';
                explosion.style.left = ex + 'px';
                explosion.style.top = ey + 'px';
                explosion.style.width = (radius * 2) + 'px';
                explosion.style.height = (radius * 2) + 'px';
                gameBoard.appendChild(explosion);
                
                requestAnimationFrame(() => {
                    explosion.style.transform = 'translate(-50%, -50%) scale(1)';
                    setTimeout(() => {
                        explosion.style.opacity = '0';
                        setTimeout(() => explosion.remove(), 200);
                    }, 100);
                });
                
                for (let j = enemies.length - 1; j >= 0; j--) {
                    const e = enemies[j];
                    if (distance(ex, ey, e.x, e.y) <= radius) {
                        applyDamage(e, proj.damage, proj.towerInfo);
                    }
                }
            } else {
                if (enemies.includes(proj.target)) {
                    applyDamage(proj.target, proj.damage, proj.towerInfo);
                }
            }
            
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
