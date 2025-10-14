/**
 * KnobController - A reusable rotary knob component with visual feedback
 */

export class KnobController {
    constructor(config) {
        this.config = {
            id: config.id,
            defaultValue: config.defaultValue ?? config.minValue ?? 0,
            minValue: config.minValue ?? 0,
            maxValue: config.maxValue ?? 1,
            startGesture: config.startGesture ?? (() => {}),
            updateValue: config.updateValue ?? (() => {}),
            endGesture: config.endGesture ?? (() => {}),
            enableRealTimeControl: config.enableRealTimeControl ?? true,
            ...config
        };

        this.element = null;
        this.gradateGroup = null;
        this.inputRange = null;
        this.slider = null;
        this.sliderShadow = null;
        this.gradateLineElements = [];

        this.STEP = 24; // Number of gradation steps
        this.DEG_RANGE = 135; // Rotation range in degrees

        this.clickTimeout = null;
        this.lastUpdateTime = 0;
        this.updateThrottle = 8; // ms
        
        this.setupElement();
        this.setupEventHandlers();
        this.initializeValue();
    }

    setupElement() {
        this.element = document.createElement('div');
        this.element.id = this.config.id;
        this.element.className = 'volume-button-knob';
        this.element.innerHTML = this.generateKnobHTML();

        const suffix = this.config.id.split('-')[0];
        this.gradateGroup = this.element.querySelector(`#gradate-${suffix}`);
        this.inputRange = this.element.querySelector(`#inputRange-${suffix}`);
        this.slider = this.element.querySelector(`#slider-${suffix}`);
        this.sliderShadow = this.element.querySelector(`#slider-shadow-${suffix}`);
        
        this.setupGradationLines();
    }

    generateKnobHTML() {
        const suffix = this.config.id.split('-')[0];
        
        return `
            <svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <radialGradient id="radial-gradient-${suffix}" cx="0.5" cy="0.5" r="0.5" gradientUnits="objectBoundingBox">
                        <stop offset="0" stop-color="#202528" />
                        <stop offset="0.849" stop-color="#272c2f" />
                        <stop offset="0.866" stop-color="#6a6d6f" />
                        <stop offset="0.87" stop-color="#202528" />
                        <stop offset="0.879" stop-color="#6a6d6f" />
                        <stop offset="0.908" stop-color="#202528" />
                        <stop offset="1" stop-color="#6a6d6f" />
                    </radialGradient>
                    <filter id="shadow-${suffix}" filterUnits="userSpaceOnUse">
                        <feOffset input="SourceAlpha" />
                        <feGaussianBlur stdDeviation="5" result="blur" />
                        <feFlood result="color" />
                        <feComposite operator="in" in="blur" />
                        <feComposite in="SourceGraphic" />
                    </filter>
                    <filter id="inset-shadow-${suffix}">
                        <feOffset input="SourceAlpha" />
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feFlood result="color" />
                        <feComposite operator="out" in="SourceGraphic" in2="blur" />
                        <feComposite operator="in" in="color" />
                        <feComposite operator="in" in2="SourceGraphic" />
                    </filter>
                </defs>
                <circle class="circle" cx="300" cy="300" r="200" />
                <g id="gradate-${suffix}" class="gradate"></g>
                <circle id="slider-${suffix}" class="slider" cx="300" cy="130" r="10" />
                <g class="slider-wrap">
                    <circle id="slider-shadow-${suffix}" class="slider" cx="300" cy="130" r="10" />
                </g>
            </svg>
            <input type="range" id="inputRange-${suffix}" min="-135" max="135" value="0" style="display: none;">
        `;
    }

    setupGradationLines() {
        const gradateLineTemplate = (deg, hue) =>
            `<line data-deg="${deg}" class="active" style="--deg: ${deg}deg; --h: ${hue}" x1="300" y1="30" x2="300" y2="70" />`;

        let gradateLines = '';
        const Q = this.DEG_RANGE / this.STEP;
        for (let i = this.DEG_RANGE * -1; i <= this.DEG_RANGE; i += Q) {
            gradateLines += gradateLineTemplate(i, i + this.DEG_RANGE * 2);
        }

        this.gradateGroup.innerHTML = gradateLines;
        this.gradateLineElements = this.gradateGroup.querySelectorAll("line");
    }

    setupEventHandlers() {
        this.element.addEventListener("click", (e) => {
            if (e.detail === 1) {
                clearTimeout(this.clickTimeout);
                this.clickTimeout = setTimeout(() => {
                    this.handleClick(e);
                }, 250);
            }
        });

        this.element.addEventListener("dblclick", (e) => {
            clearTimeout(this.clickTimeout);
            this.handleDoubleClick(e);
        });

        this.element.addEventListener("mousedown", (e) => this.handleMouseDown(e));
        this.element.addEventListener("touchstart", (e) => this.handleTouchStart(e), { passive: false });
    }

    delayedClickHandler(e) {
        clearTimeout(this.clickTimeout);
        this.clickTimeout = setTimeout(() => {
            this.handleClick(e);
        }, 200);
    }

    handleClick(e) {
        e.preventDefault();
        this.setByCoords(e.clientX, e.clientY);
    }

    handleDoubleClick(e) {
        e.preventDefault();
        e.stopPropagation();
        clearTimeout(this.clickTimeout);
        
        this.config.startGesture();
        const defaultRotation = this.mapValueToRotation(this.config.defaultValue);
        this.setValue(defaultRotation);
        this.inputRange.value = defaultRotation;
        this.config.updateValue(this.config.defaultValue);
        this.config.endGesture();
        
        console.log(`Reset ${this.config.id} to default value: ${this.config.defaultValue}`);
    }

    handleMouseDown(e) {
        e.preventDefault();

        if (e.detail === 2) {
            return;
        }
        
        let isDragging = true;
        this.config.startGesture();
        this.element.classList.add("without-animate");
        this.element.style.cursor = "grabbing";

        const handleMouseMove = (e) => {
            if (!isDragging) return;
            this.handleClick(e);
        };
        
        const handleMouseUp = () => {
            isDragging = false;
            this.element.classList.remove("without-animate");
            this.element.style.cursor = "unset";
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
            this.config.endGesture();
        };
        
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
    }

    handleTouchStart(e) {
        e.preventDefault();
        let isDragging = true;
        this.config.startGesture();
        this.element.classList.add("without-animate");
        
        const touch = e.touches[0];
        if (touch) {
            this.setByCoords(touch.pageX, touch.pageY);
        }
        
        const handleTouchMove = (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const touch = e.touches[0];
            if (touch) {
                this.setByCoords(touch.pageX, touch.pageY);
            }
        };
        
        const handleTouchEnd = () => {
            isDragging = false;
            this.element.classList.remove("without-animate");
            document.removeEventListener("touchmove", handleTouchMove);
            document.removeEventListener("touchend", handleTouchEnd);
            this.config.endGesture();
        };
        
        document.addEventListener("touchmove", handleTouchMove, { passive: false });
        document.addEventListener("touchend", handleTouchEnd);
    }

    setByCoords(clientX, clientY) {
        const now = performance.now();
        if (now - this.lastUpdateTime < this.updateThrottle) return;
        this.lastUpdateTime = now;

        const rect = this.element.getBoundingClientRect();
        const CX = rect.width / 2;
        const CY = rect.height / 2;

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const r = Math.atan2(y - CY, x - CX);
        const res = Math.round((r / Math.PI) * 180) + 90;

        let value = res <= 180 ? res : res - 360;
        value = Math.max(this.DEG_RANGE * -1, Math.min(this.DEG_RANGE, value));

        this.setValue(value);
        this.inputRange.value = value;
        
        const paramValue = this.mapRotationToValue(value);
        this.config.updateValue(paramValue);
    }

    setValue(v) {
        this.deactiveAll();
        this.active(v);
        this.slider.style.setProperty("--deg", `${v}deg`);
        this.sliderShadow.style.setProperty("--deg", `${v}deg`);
        this.slider.style.setProperty("--h", `${v * 1 + this.DEG_RANGE * 2}`);
    }

    deactiveAll() {
        this.gradateLineElements.forEach((l) => {
            l.classList.remove("active");
        });
    }

    active(v) {
        for (let i = 0; i < this.gradateLineElements.length; i++) {
            const l = this.gradateLineElements[i];
            if (parseFloat(l.dataset.deg) <= v) l.classList.add("active");
        }
    }

    mapValueToRotation(inputValue) {
        const normalizedValue = (inputValue - this.config.minValue) / (this.config.maxValue - this.config.minValue);
        return (normalizedValue * 2 - 1) * this.DEG_RANGE;
    }
    
    mapRotationToValue(rotationDegrees) {
        const normalizedRotation = rotationDegrees / this.DEG_RANGE;
        return this.config.minValue + (normalizedRotation + 1) * 0.5 * (this.config.maxValue - this.config.minValue);
    }

    updateDisplay(nextValue) {
        const targetRotation = this.mapValueToRotation(nextValue);
        this.setValue(targetRotation);
        this.inputRange.value = targetRotation;
    }

    initializeValue() {
        this.updateDisplay(this.config.defaultValue);
    }

    getElement() {
        return this.element;
    }

    getValue() {
        return this.mapRotationToValue(parseFloat(this.inputRange.value));
    }

    destroy() {
        clearTimeout(this.clickTimeout);
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}