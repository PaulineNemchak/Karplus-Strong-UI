/**
 * AmplitudeDisplay - A reusable amplitude visualization component
 */

export class AmplitudeDisplay {
    constructor(config) {
        this.config = {
            canvas: config.canvas,
            canvasId: config.canvasId || 'amplitude-canvas',
            width: config.width || 280,
            height: config.height || 140,
            updateRate: config.updateRate || 30, // Updates per second
            gainBoost: config.gainBoost || 1.2,
            ...config
        };

        this.canvas = null;
        this.ctx = null;
        this.amplitudeHistory = [];
        this.maxAmplitude = 0.1;
        this.scaleUpdateCounter = 0;
        this.scaleUpdateInterval = 30;
        this.unsubscribeCallback = null;

        this.setupCanvas();
    }

    setupCanvas() {
        this.canvas = this.config.canvas || document.getElementById(this.config.canvasId);
        if (!this.canvas) {
            console.error(`Canvas element not found (ID: ${this.config.canvasId})`);
            return;
        }

        this.ctx = this.canvas.getContext('2d');

        this.ctx.imageSmoothingEnabled = false;
        this.ctx.webkitImageSmoothingEnabled = false;
        this.ctx.mozImageSmoothingEnabled = false;
        this.ctx.msImageSmoothingEnabled = false;

        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.config.width * dpr;
        this.canvas.height = this.config.height * dpr;
        this.canvas.style.width = this.config.width + 'px';
        this.canvas.style.height = this.config.height + 'px';
        this.ctx.scale(dpr, dpr);

        this.amplitudeHistory = new Array(this.config.width).fill(0);

        this.draw();
    }

    connect(amplitudeBinding) {
        if (!amplitudeBinding || !amplitudeBinding.attachListener) {
            console.error('Invalid amplitude binding provided');
            return;
        }

        this.disconnect();

        this.unsubscribeCallback = amplitudeBinding.attachListener((value) => {
            this.updateAmplitude(value);
        });

        console.log('AmplitudeDisplay connected to amplitude source');
    }

    disconnect() {
        if (this.unsubscribeCallback) {
            this.unsubscribeCallback();
            this.unsubscribeCallback = null;
        }
    }

    updateAmplitude(value) {
        const processedValue = Math.pow(value, 0.7) * this.config.gainBoost;

        if (processedValue > this.maxAmplitude) {
            this.maxAmplitude = processedValue * 1.1;
        } else if (this.scaleUpdateCounter++ > this.scaleUpdateInterval) {
            // Gradually reduce max amplitude if no peaks for a while
            const historyMax = Math.max(...this.amplitudeHistory);
            if (historyMax < this.maxAmplitude * 0.7) {
                this.maxAmplitude = Math.max(0.1, historyMax * 1.3);
            }
            this.scaleUpdateCounter = 0;
        }
        
        this.amplitudeHistory.shift();
        this.amplitudeHistory.push(processedValue);

        this.draw();
    }

    draw() {
        if (!this.ctx) return;

        const { width, height } = this.config;
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        this.ctx.fillRect(0, 0, width, height);

        this.ctx.strokeStyle = '#fefffeff';
        this.ctx.lineWidth = 1.5;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.beginPath();

        let hasStarted = false;
        for (let i = 0; i < this.amplitudeHistory.length - 1; i++) {
            const x = Math.floor(i) + 0.5;
            const normalizedY = Math.min(1.0, this.amplitudeHistory[i] / this.maxAmplitude);
            const y = Math.floor(height - 10 - (normalizedY * (height - 30))) + 0.5;
            
            if (!hasStarted) {
                this.ctx.moveTo(x, y);
                hasStarted = true;
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.stroke();

        const normalizedCurrentY = Math.min(1.0, this.amplitudeHistory[this.amplitudeHistory.length - 1] / this.maxAmplitude);
        const currentY = Math.floor(height - 10 - (normalizedCurrentY * (height - 30)));
        const currentX = Math.floor(width - 2);

        this.ctx.fillStyle = '#fefffeff';
        this.ctx.beginPath();
        this.ctx.arc(currentX, currentY, 2, 0, Math.PI * 2);
        this.ctx.fill();
    }

    reset() {
        this.amplitudeHistory.fill(0);
        this.maxAmplitude = 0.1;
        this.scaleUpdateCounter = 0;
        this.draw();
    }

    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };

        if (newConfig.width || newConfig.height) {
            this.setupCanvas();
        }
    }

    getStats() {
        const current = this.amplitudeHistory[this.amplitudeHistory.length - 1] || 0;
        const max = Math.max(...this.amplitudeHistory);
        const avg = this.amplitudeHistory.reduce((a, b) => a + b, 0) / this.amplitudeHistory.length;
        
        return {
            current,
            max,
            average: avg,
            maxScale: this.maxAmplitude
        };
    }

    destroy() {
        this.disconnect();
        this.amplitudeHistory = [];
        this.canvas = null;
        this.ctx = null;
    }
}