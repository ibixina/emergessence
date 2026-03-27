// ===== THEME INITIALIZATION =====
const themes = ['indigo', 'teal', 'crimson', 'emerald', 'amber', 'azure'];
const themeColors = {
    indigo: { r: 128, g: 0, b: 255 },
    teal: { r: 0, g: 128, b: 128 },
    crimson: { r: 139, g: 0, b: 0 },
    emerald: { r: 0, g: 153, b: 76 },
    amber: { r: 220, g: 100, b: 0 },
    azure: { r: 0, g: 120, b: 255 }
};

const selectedTheme = themes[Math.floor(Math.random() * themes.length)];
document.documentElement.setAttribute('data-theme', selectedTheme);
const accentColor = themeColors[selectedTheme];

function updateThemeGradientCache() {
    if (typeof updateGradientCacheTheme === 'function') {
        updateGradientCacheTheme();
    }
}
updateThemeGradientCache();

// Helper function to get accent color with alpha
function getAccentRGBA(alpha) {
    return `rgba(${accentColor.r}, ${accentColor.g}, ${accentColor.b}, ${alpha})`;
}

function getAccentRGB() {
    return `rgb(${accentColor.r}, ${accentColor.g}, ${accentColor.b})`;
}

// COMPREHENSIVE NEURAL NETWORK - Fixed Version

// ===== COMPREHENSIVE NEURAL NETWORK =====
let cursorX = -1000;
let cursorY = -1000;

document.addEventListener('mousemove', (e) => {
    cursorX = e.clientX;
    cursorY = e.clientY;
}, { passive: true });

const canvas = document.getElementById('neural-canvas');
if (canvas) {
    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    let width, height;
    let animationId;

    function getNodeCount() {
        const area = window.innerWidth * window.innerHeight;
        const baseCount = 35;
        const scaledCount = Math.floor((area / (1920 * 1080)) * 50);
        return Math.max(baseCount, Math.min(scaledCount, 80));
    }

    let MAX_NODES = getNodeCount();

    const gradientCache = {
        nodeGlows: [],
        signalGlows: []
    };

    function createGradientCache() {
        gradientCache.nodeGlows = [];
        gradientCache.signalGlows = [];

        const sizes = [3, 5, 8, 12, 15];
        sizes.forEach(size => {
            const offscreen = document.createElement('canvas');
            offscreen.width = size * 2;
            offscreen.height = size * 2;
            const octx = offscreen.getContext('2d');

            const gradient = octx.createRadialGradient(size, size, 0, size, size, size);
            gradient.addColorStop(0, 'rgba(255,255,255,1)');
            gradient.addColorStop(0.3, 'rgba(128,0,255,0.6)');
            gradient.addColorStop(1, 'rgba(128,0,255,0)');

            octx.fillStyle = gradient;
            octx.fillRect(0, 0, offscreen.width, offscreen.height);

            gradientCache.nodeGlows.push({ canvas: offscreen, size });
        });

        [10, 15, 20].forEach(size => {
            const offscreen = document.createElement('canvas');
            offscreen.width = size * 2;
            offscreen.height = size * 2;
            const octx = offscreen.getContext('2d');

            const gradient = octx.createRadialGradient(size, size, 0, size, size, size);
            gradient.addColorStop(0, 'rgba(255,255,255,0.8)');
            gradient.addColorStop(0.4, 'rgba(128,0,255,0.3)');
            gradient.addColorStop(1, 'rgba(128,0,255,0)');

            octx.fillStyle = gradient;
            octx.fillRect(0, 0, offscreen.width, offscreen.height);

            gradientCache.signalGlows.push({ canvas: offscreen, size });
        });
    }

    createGradientCache();

    function updateGradientCacheTheme() {
        const rgba = getAccentRGB();
        const [r, g, b] = rgba.match(/\d+/g);

        gradientCache.nodeGlows.forEach(({ canvas: offscreen, size }) => {
            const octx = offscreen.getContext('2d');
            octx.clearRect(0, 0, offscreen.width, offscreen.height);

            const gradient = octx.createRadialGradient(size, size, 0, size, size, size);
            gradient.addColorStop(0, 'rgba(255,255,255,1)');
            gradient.addColorStop(0.3, `rgba(${r},${g},${b},0.6)`);
            gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);

            octx.fillStyle = gradient;
            octx.fillRect(0, 0, offscreen.width, offscreen.height);
        });

        gradientCache.signalGlows.forEach(({ canvas: offscreen, size }) => {
            const octx = offscreen.getContext('2d');
            octx.clearRect(0, 0, offscreen.width, offscreen.height);

            const gradient = octx.createRadialGradient(size, size, 0, size, size, size);
            gradient.addColorStop(0, 'rgba(255,255,255,0.8)');
            gradient.addColorStop(0.4, `rgba(${r},${g},${b},0.3)`);
            gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);

            octx.fillStyle = gradient;
            octx.fillRect(0, 0, offscreen.width, offscreen.height);
        });
    }

    updateGradientCacheTheme();

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        MAX_NODES = getNodeCount();
        initNodes();
    }

    // Enhanced Node class
    class Node {
        constructor(x, y) {
            this.reset(x, y);
        }

        reset(x, y) {
            this.x = x ?? Math.random() * width;
            this.y = y ?? Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.8;
            this.vy = (Math.random() - 0.5) * 0.8;
            this.radius = Math.random() * 3 + 2;
            this.energy = Math.random();
            this.pulse = Math.random() * Math.PI * 2;
            this.type = Math.random() > 0.7 ? 1 : 0;
            this.activity = 0;
            this.lastFired = 0;
        }

        update(time) {
            this.x += this.vx;
            this.y += this.vy;

            if (this.x < 0 || this.x > width) this.vx *= -1;
            if (this.y < 0 || this.y > height) this.vy *= -1;

            this.x = Math.max(0, Math.min(width, this.x));
            this.y = Math.max(0, Math.min(height, this.y));

            this.pulse += 0.05;
            this.energy = (Math.sin(this.pulse) + 1) / 2;

            const dx = cursorX - this.x;
            const dy = cursorY - this.y;
            const distSq = dx * dx + dy * dy;

            if (distSq < 40000 && distSq > 2500) {
                const dist = Math.sqrt(distSq);
                const force = (200 - dist) / 200 * 0.5;
                this.vx += (dx / dist) * force * 0.1;
                this.vy += (dy / dist) * force * 0.1;
            } else if (distSq < 2500) {
                const dist = Math.sqrt(distSq);
                const force = (50 - dist) / 50 * 0.5;
                this.vx -= (dx / dist) * force * 0.2;
                this.vy -= (dy / dist) * force * 0.2;
            }

            this.activity *= 0.95;

            if (Math.random() < 0.005 && time - this.lastFired > 50) {
                this.fire();
                this.lastFired = time;
            }

            this.vx *= 0.99;
            this.vy *= 0.99;
        }

        fire() {
            this.activity = 1;
            this.energy = 1;
        }

        draw() {
            const ix = this.x | 0;
            const iy = this.y | 0;

            if (ix < -50 || ix > width + 50 || iy < -50 || iy > height + 50) return;

            const size = this.radius * (1 + this.energy * 0.3);
            const activityBoost = this.activity * 0.5;
            const glowSize = this.type === 1 ? size * 5 : size * 3;

            if (this.energy + activityBoost > 0.3) {
                const glowCanvas = gradientCache.nodeGlows.find(g => g.size >= glowSize) || gradientCache.nodeGlows[gradientCache.nodeGlows.length - 1];
                const scale = glowSize / glowCanvas.size;
                ctx.globalAlpha = (this.energy + activityBoost) * 0.4;
                ctx.drawImage(glowCanvas.canvas, ix - glowSize, iy - glowSize, glowSize * 2, glowSize * 2);
                ctx.globalAlpha = 1;
            }

            if (this.activity > 0.7) {
                ctx.fillStyle = '#ffffff';
            } else if (this.energy > 0.7 || this.type === 1) {
                ctx.fillStyle = getAccentRGB();
            } else {
                ctx.fillStyle = '#000000';
            }

            ctx.beginPath();
            ctx.arc(ix, iy, size, 0, Math.PI * 2);
            ctx.fill();

            if (this.activity > 0.5 || this.energy > 0.8) {
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(ix, iy, size * 0.4, 0, Math.PI * 2);
                ctx.fill();
            }

            if (this.type === 1) {
                ctx.strokeStyle = getAccentRGBA(this.energy * 0.6);
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(ix, iy, size + 4, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    }

    class Signal {
        constructor() {
            this.reset();
        }

        reset(from, to) {
            if (!from || !to) {
                this.active = false;
                return;
            }
            this.from = from;
            this.to = to;
            this.progress = 0;
            this.speed = 0.015 + Math.random() * 0.025;
            this.active = true;
            this.strength = 0.5 + Math.random() * 0.5;
            this.dx = to.x - from.x;
            this.dy = to.y - from.y;
        }

        update() {
            if (!this.from || !this.to) {
                this.active = false;
                return false;
            }
            this.progress += this.speed;
            if (this.progress >= 1) {
                this.active = false;
                if (this.to && this.to.fire) this.to.fire();
                return false;
            }
            return true;
        }

        draw() {
            if (!this.from || !this.to) return;

            const ix = (this.from.x + this.dx * this.progress) | 0;
            const iy = (this.from.y + this.dy * this.progress) | 0;

            if (ix < -50 || ix > width + 50 || iy < -50 || iy > height + 50) return;

            const signalCanvas = gradientCache.signalGlows[1];
            ctx.globalAlpha = this.strength;
            ctx.drawImage(signalCanvas.canvas, ix - 20, iy - 20, 40, 40);
            ctx.globalAlpha = 1;

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(ix, iy, 4, 0, Math.PI * 2);
            ctx.fill();

            for (let i = 1; i <= 2; i++) {
                const trailProgress = this.progress - i * 0.1;
                if (trailProgress > 0) {
                    const tx = (this.from.x + this.dx * trailProgress) | 0;
                    const ty = (this.from.y + this.dy * trailProgress) | 0;
                    const alpha = (1 - i * 0.5) * this.strength * 0.4;

                    ctx.fillStyle = getAccentRGBA(alpha);
                    ctx.beginPath();
                    ctx.arc(tx, ty, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }

    let nodes = [];
    let signals = [];
    let time = 0;
    const CONNECTION_DISTANCE = 200;
    const CONNECTION_DISTANCE_SQ = CONNECTION_DISTANCE * CONNECTION_DISTANCE;

    const GRID_SIZE = 250;
    let spatialGrid = {};

    function getCellKey(x, y) {
        return `${Math.floor(x / GRID_SIZE)},${Math.floor(y / GRID_SIZE)}`;
    }

    function updateSpatialGrid() {
        spatialGrid = {};
        for (let i = 0; i < nodes.length; i++) {
            const key = getCellKey(nodes[i].x, nodes[i].y);
            if (!spatialGrid[key]) spatialGrid[key] = [];
            spatialGrid[key].push(i);
        }
    }

    function initNodes() {
        nodes = [];
        for (let i = 0; i < MAX_NODES; i++) {
            nodes.push(new Node());
        }
        updateSpatialGrid();
    }

    class ObjectPool {
        constructor(createFn, resetFn, initialSize = 50) {
            this.pool = [];
            this.active = [];
            this.createFn = createFn;
            this.resetFn = resetFn;
            for (let i = 0; i < initialSize; i++) {
                this.pool.push(createFn());
            }
        }

        get(...args) {
            let obj = this.pool.pop();
            if (!obj) obj = this.createFn();
            this.resetFn(obj, ...args);
            if (obj.active !== false) {
                this.active.push(obj);
            } else {
                this.pool.push(obj);
            }
            return obj;
        }

        release(obj) {
            const index = this.active.indexOf(obj);
            if (index > -1) {
                this.active.splice(index, 1);
                this.pool.push(obj);
            }
        }

        releaseAll() {
            this.pool.push(...this.active);
            this.active.length = 0;
        }
    }

    const signalPool = new ObjectPool(
        () => new Signal(),
        (signal, from, to) => signal.reset(from, to),
        30
    );

    let lastSignalTime = 0;
    const SIGNAL_INTERVAL = 150;

    function createSignals(currentTime) {
        if (currentTime - lastSignalTime < SIGNAL_INTERVAL) return;
        lastSignalTime = currentTime;

        if (nodes.length > 1 && signalPool.active.length < 25) {
            if (Math.random() < 0.3) {
                const startNode = nodes[Math.floor(Math.random() * nodes.length)];
                if (startNode) {
                    startNode.fire();

                    const key = getCellKey(startNode.x, startNode.y);
                    const nearby = [];

                    for (let dx = -1; dx <= 1; dx++) {
                        for (let dy = -1; dy <= 1; dy++) {
                            const cellX = Math.floor(startNode.x / GRID_SIZE) + dx;
                            const cellY = Math.floor(startNode.y / GRID_SIZE) + dy;
                            const checkKey = `${cellX},${cellY}`;
                            if (spatialGrid[checkKey]) nearby.push(...spatialGrid[checkKey]);
                        }
                    }

                    for (let i = 0; i < nearby.length && i < 5; i++) {
                        const nodeIdx = nearby[i];
                        const node = nodes[nodeIdx];
                        if (node && node !== startNode && Math.random() < 0.4) {
                            const dx = startNode.x - node.x;
                            const dy = startNode.y - node.y;
                            if (dx * dx + dy * dy < CONNECTION_DISTANCE_SQ) {
                                signalPool.get(startNode, node);
                            }
                        }
                    }
                }
            } else {
                const from = nodes[Math.floor(Math.random() * nodes.length)];
                const to = nodes[Math.floor(Math.random() * nodes.length)];
                if (from && to && from !== to) {
                    const dx = from.x - to.x;
                    const dy = from.y - to.y;
                    if (dx * dx + dy * dy < CONNECTION_DISTANCE_SQ) {
                        signalPool.get(from, to);
                    }
                }
            }
        }
    }

    function drawConnections() {
        ctx.lineWidth = 1;

        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            const ix = node.x | 0;
            const iy = node.y | 0;

            if (ix < -CONNECTION_DISTANCE || ix > width + CONNECTION_DISTANCE ||
                iy < -CONNECTION_DISTANCE || iy > height + CONNECTION_DISTANCE) continue;

            const key = getCellKey(node.x, node.y);

            for (let dx = 0; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === -1) continue;

                    const cellX = Math.floor(node.x / GRID_SIZE) + dx;
                    const cellY = Math.floor(node.y / GRID_SIZE) + dy;
                    const checkKey = `${cellX},${cellY}`;

                    if (!spatialGrid[checkKey]) continue;

                    for (const j of spatialGrid[checkKey]) {
                        if (j <= i) continue;

                        const other = nodes[j];
                        if (!other) continue;

                        const ddx = node.x - other.x;
                        const ddy = node.y - other.y;
                        const distSq = ddx * ddx + ddy * ddy;

                        if (distSq < CONNECTION_DISTANCE_SQ) {
                            const dist = Math.sqrt(distSq);
                            const opacity = (CONNECTION_DISTANCE - dist) / CONNECTION_DISTANCE;
                            const avgEnergy = (node.energy + other.energy) / 2;
                            const avgActivity = (node.activity + other.activity) / 2;

                            ctx.strokeStyle = `rgba(0, 0, 0, ${opacity * 0.4})`;
                            ctx.lineWidth = 1 + avgEnergy;
                            ctx.beginPath();
                            ctx.moveTo(ix, iy);
                            ctx.lineTo(other.x | 0, other.y | 0);
                            ctx.stroke();

                            if (avgEnergy > 0.6 || avgActivity > 0.3) {
                                const energyOpacity = Math.max(avgEnergy, avgActivity) * opacity;
                                ctx.strokeStyle = getAccentRGBA(energyOpacity * 0.6);
                                ctx.lineWidth = 2 + avgEnergy * 2;
                                ctx.beginPath();
                                ctx.moveTo(ix, iy);
                                ctx.lineTo(other.x | 0, other.y | 0);
                                ctx.stroke();
                                ctx.lineWidth = 1;
                            }
                        }
                    }
                }
            }
        }
    }

    let lastTime = performance.now();
    let isTabVisible = true;

    document.addEventListener('visibilitychange', () => {
        isTabVisible = !document.hidden;
        if (isTabVisible) {
            lastTime = performance.now();
        }
    });

    function animate(currentTime) {
        if (!isTabVisible) {
            animationId = requestAnimationFrame(animate);
            return;
        }

        const deltaTime = currentTime - lastTime;
        lastTime = currentTime;

        if (deltaTime < 16) {
            animationId = requestAnimationFrame(animate);
            return;
        }

        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(0, 0, width, height);

        if (time % 10 === 0) {
            updateSpatialGrid();
        }

        drawConnections();

        for (let i = signalPool.active.length - 1; i >= 0; i--) {
            const signal = signalPool.active[i];
            if (!signal.update()) {
                signalPool.release(signal);
            } else {
                signal.draw();
            }
        }

        for (let i = 0; i < nodes.length; i++) {
            nodes[i].update(time);
            nodes[i].draw();
        }

        createSignals(currentTime);

        time++;
        animationId = requestAnimationFrame(animate);
    }

    resize();
    window.addEventListener('resize', resize);
    animationId = requestAnimationFrame(animate);
}

// ===== LIVING INK BLOT EFFECT (High Performance) =====
class LivingInk {
    constructor(container) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: true });
        this.container.appendChild(this.canvas);

        this.particles = [];
        this.mouseX = -1000;
        this.mouseY = -1000;
        this.isHovered = false;
        this.animationId = null;
        this.particleCount = 60;

        // Bind handlers for proper cleanup
        this.resizeHandler = () => this.resize();
        this.mouseEnterHandler = () => {
            this.isHovered = true;
            if (!this.animationId) this.animate();
        };
        this.mouseLeaveHandler = () => {
            this.isHovered = false;
        };
        this.mouseMoveHandler = (e) => {
            const rect = this.container.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        };

        this.init();
    }

    init() {
        this.resize();
        window.addEventListener('resize', this.resizeHandler);
        this.container.addEventListener('mouseenter', this.mouseEnterHandler);
        this.container.addEventListener('mouseleave', this.mouseLeaveHandler);
        this.container.addEventListener('mousemove', this.mouseMoveHandler);

        // Create particles (alive, swarm behavior)
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                size: Math.random() * 1.5 + 0.5,
                jitter: Math.random() * 0.4 + 0.1,
                accel: 0.08 + Math.random() * 0.05
            });
        }
    }

    resize() {
        const rect = this.container.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    animate() {
        // Stop if not hovered and particles have settled
        if (!this.isHovered && this.particles.every(p => Math.abs(p.vx) < 0.05 && Math.abs(p.vy) < 0.05)) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            this.animationId = null;
            return;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';

        const swarmTargetX = this.isHovered ? this.mouseX : this.canvas.width / 2;
        const swarmTargetY = this.isHovered ? this.mouseY : this.canvas.height / 2;

        this.particles.forEach(p => {
            // Steering towards target
            const dx = swarmTargetX - p.x;
            const dy = swarmTargetY - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (this.isHovered) {
                const force = Math.min(dist * 0.002, p.accel);
                p.vx += (dx / dist) * force;
                p.vy += (dy / dist) * force;
            } else {
                // Return to center slowly
                p.vx += (dx / dist) * 0.001;
                p.vy += (dy / dist) * 0.001;
            }

            // Life-like jitter
            p.vx += (Math.random() - 0.5) * p.jitter;
            p.vy += (Math.random() - 0.5) * p.jitter;

            // Friction
            p.vx *= 0.95;
            p.vy *= 0.95;

            p.x += p.vx;
            p.y += p.vy;

            // Drawing
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();

            // Subtle "bleeding" connections
            if (dist < 30) {
                this.ctx.beginPath();
                this.ctx.strokeStyle = `rgba(0, 0, 0, ${0.1 * (1 - dist / 30)})`;
                this.ctx.moveTo(p.x, p.y);
                this.ctx.lineTo(swarmTargetX, swarmTargetY);
                this.ctx.stroke();
            }
        });

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        window.removeEventListener('resize', this.resizeHandler);
        this.container.removeEventListener('mouseenter', this.mouseEnterHandler);
        this.container.removeEventListener('mouseleave', this.mouseLeaveHandler);
        this.container.removeEventListener('mousemove', this.mouseMoveHandler);
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.canvas.remove();
        this.particles = [];
    }
}

const specBoxes = document.querySelectorAll('.spec-box');
const livingInkInstances = [];
specBoxes.forEach(box => livingInkInstances.push(new LivingInk(box)));

// ===== INTERACTIVE PROJECT CARDS - SIMPLIFIED 3D TILT =====
const projectCards = document.querySelectorAll('.project-card');

projectCards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = `opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${index * 100}ms`;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    observer.observe(card);

    // Simple 3D tilt without gradients
    let rafId = null;
    let targetRotateX = 0;
    let targetRotateY = 0;
    let currentRotateX = 0;
    let currentRotateY = 0;

    function updateTransform() {
        currentRotateX += (targetRotateX - currentRotateX) * 0.1;
        currentRotateY += (targetRotateY - currentRotateY) * 0.1;

        if (Math.abs(targetRotateX - currentRotateX) > 0.01 || Math.abs(targetRotateY - currentRotateY) > 0.01) {
            card.style.transform = `perspective(1000px) rotateX(${currentRotateX}deg) rotateY(${currentRotateY}deg) scale(1.02)`;
            rafId = requestAnimationFrame(updateTransform);
        } else {
            rafId = null;
        }
    }

    card.addEventListener('mouseenter', () => {
        if (!rafId) rafId = requestAnimationFrame(updateTransform);
    });

    card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        targetRotateX = ((y - centerY) / centerY) * -8;
        targetRotateY = ((x - centerX) / centerX) * 8;

        if (!rafId) rafId = requestAnimationFrame(updateTransform);
    }, { passive: true });

    card.addEventListener('mouseleave', () => {
        targetRotateX = 0;
        targetRotateY = 0;
        if (!rafId) rafId = requestAnimationFrame(updateTransform);

        setTimeout(() => {
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            card.style.transform = '';
        }, 300);
    });
});

// ===== FEATURED PROJECT CARDS - Horizontal Scroll Animation =====
const featuredCards = document.querySelectorAll('.project-card-featured');

featuredCards.forEach((card, index) => {
    card.style.transitionDelay = `${index * 120}ms`;
});

const featuredObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('card-visible');
            featuredObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

featuredCards.forEach(card => featuredObserver.observe(card));

// Smooth horizontal scroll with mouse wheel
const scrollWrapper = document.querySelector('.project-scroll-wrapper');
if (scrollWrapper) {
    scrollWrapper.addEventListener('wheel', (e) => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
            e.preventDefault();
            scrollWrapper.scrollLeft += e.deltaY * 1.5;
        }
    }, { passive: false });
}

// ===== CRYPTIC DECODING EFFECT (Optimized) =====
const crypticObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // Trigger animation if attached to element
            if (entry.target.triggerCrypticAnimation) {
                entry.target.triggerCrypticAnimation();
            }
        }
    });
}, { threshold: 0.5 });

function setupCrypticEffect(element, config = {}) {
    const {
        speed = 40,
        stagger = 2,
        initialDelay = 0,
        startEncrypted = false,
        charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*"
    } = config;

    const originalHTML = element.innerHTML;
    let isRolling = false;
    let isDecoded = !startEncrypted;

    // Split by <br> tags to preserve structure
    const lines = originalHTML.split(/<br\s*\/?>/i);

    const scramble = () => {
        return lines.map((line) => {
            return line.split('').map((char) => {
                if (char === ' ') return ' ';
                return charset[Math.floor(Math.random() * charset.length)];
            }).join('');
        }).join('<br>');
    };

    if (startEncrypted) {
        const initializeEncryption = () => {
            const rect = element.getBoundingClientRect();
            if (rect.width > 0) {
                element.style.minWidth = `${rect.width}px`;
                element.style.minHeight = `${rect.height}px`;
                element.innerHTML = scramble();
            } else {
                requestAnimationFrame(initializeEncryption);
            }
        };
        initializeEncryption();
    }

    const triggerRoll = () => {
        if (isRolling) return;
        isRolling = true;

        const rect = element.getBoundingClientRect();
        element.style.minWidth = `${rect.width}px`;
        element.style.minHeight = `${rect.height}px`;

        let frame = 0;
        const totalLetters = lines.join('').length;

        const interval = setInterval(() => {
            let completeCount = 0;
            let charIndex = 0;

            const newHTML = lines.map((line) => {
                const letters = line.split('');
                return letters.map((char) => {
                    const stopFrame = 8 + (charIndex * stagger);
                    charIndex++;

                    if (frame >= stopFrame) {
                        completeCount++;
                        return char;
                    }

                    if (char === ' ') return ' ';
                    return charset[Math.floor(Math.random() * charset.length)];
                }).join('');
            }).join('<br>');

            element.innerHTML = newHTML;
            frame++;

            if (completeCount >= totalLetters || frame > 100) {
                clearInterval(interval);
                element.innerHTML = originalHTML;
                isRolling = false;
                isDecoded = true;
                element.style.minWidth = '';
                element.style.minHeight = '';
            }
        }, speed);
    };

    // Attach trigger to element for observer access
    element.triggerCrypticAnimation = () => {
        if (!isRolling && !isDecoded) triggerRoll();
    };

    element.addEventListener('mouseenter', triggerRoll);

    if (initialDelay > 0) setTimeout(triggerRoll, initialDelay);

    if (!startEncrypted) {
        crypticObserver.observe(element);
    }
}

// Apply effects
const subtitle = document.querySelector('.subtitle');
if (subtitle) {
    setupCrypticEffect(subtitle, { speed: 30, stagger: 1, initialDelay: 1200 });
}

document.querySelectorAll('.block-title').forEach(title => {
    setupCrypticEffect(title, { speed: 25, stagger: 1, startEncrypted: true });
});

document.querySelectorAll('.title-word').forEach(word => {
    setupCrypticEffect(word, { 
        speed: 30, 
        stagger: 2,
        charset: "Λⲃ⊂◖Ξ╒⟒⊦ǀ⌡⋉⌊⋈⊓⎔☧⍜Ɽ⟆⊺⋃∨Ⱳ⨉⋎⦚0123456789@#$%&*"
    });
});

// ===== SMOOTH SCROLL =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// ===== KEYBOARD CONTROLS =====
document.addEventListener('keydown', (e) => {
    if (!canvas || typeof signalPool === 'undefined') return;

    const key = e.key.toLowerCase();

    switch (key) {
        case 'n':
            if (nodes.length < 100) {
                const newNode = new Node();
                newNode.reset(cursorX, cursorY);
                newNode.fire();
                nodes.push(newNode);
            }
            break;

        case 'c':
            initNodes();
            signalPool.releaseAll();
            break;

        case 'e':
            nodes.forEach(node => {
                const dx = node.x - cursorX;
                const dy = node.y - cursorY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                setTimeout(() => node.fire(), dist * 2);
            });
            break;

        case 's':
            let nearestNode = null;
            let minDist = Infinity;

            for (const node of nodes) {
                const dx = node.x - cursorX;
                const dy = node.y - cursorY;
                const dist = dx * dx + dy * dy;
                if (dist < minDist) {
                    minDist = dist;
                    nearestNode = node;
                }
            }

            if (nearestNode) {
                nearestNode.fire();
                const nearby = nodes.filter(node => {
                    if (node === nearestNode) return false;
                    const dx = nearestNode.x - node.x;
                    const dy = nearestNode.y - node.y;
                    return dx * dx + dy * dy < CONNECTION_DISTANCE_SQ * 4;
                });
                nearby.forEach(node => signalPool.get(nearestNode, node));
            }
            break;
    }
});

// ===== HEADER VISIBILITY =====
const header = document.querySelector('.header');
if (header) {
    window.addEventListener('scroll', () => {
        if (window.scrollY > window.innerHeight * 0.3) {
            header.classList.add('header-hidden');
        } else {
            header.classList.remove('header-hidden');
        }
    }, { passive: true });
}
