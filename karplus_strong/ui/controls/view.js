import { KnobController } from "./KnobController.js";
import { AmplitudeDisplay } from "./AmplitudeDisplay.js";

export function createKarplusView(parameterBindings, configuration = {}) {
    const elementName = "karplus-strong-interface";

    if (!customElements.get(elementName))
        customElements.define(elementName, KarplusStrongInterface);

    return new KarplusStrongInterface(parameterBindings, configuration);
}

class KarplusStrongInterface extends HTMLElement {
    constructor(parameterBindings = {}, { enableRealTimeControl = true } = {}) {
        super();

        this.shadowDOM = this.attachShadow({ mode: "closed" });
        this.knobs = new Map();
        this.amplitudeDisplay = null;
        this.activeSubscriptions = [];
        this.parameterBindings = parameterBindings;
        this.enableRealTimeControl = enableRealTimeControl;

        this.initializationCallback = () => {
            this.shadowDOM.innerHTML = this.generateInterfaceHTML();
            this.setupKnobs();
            this.setupAmplitudeDisplay();
            this.setupCleanup();
        };
    }

    generateInterfaceHTML() {
        const dynamicCastBrandingSVG = `data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 40'%3e%3ctext x='50' y='25' font-family='Arial' font-size='18' font-weight='bold' text-anchor='middle' fill='white'%3eDYNAMIC CAST%3c/text%3e%3c/svg%3e`;
        
        return `
            ${this.generateCSS()}
            <div class="karplus-main-panel">
                <div class="title-section">KARPLUS-STRONG</div>
                
                <div class="control-section">
                    <div id="impulse-knob-container" class="knob-container" style="left: 23px;"></div>
                    <div class="control-label" style="top: 150px; left: 23px; width: 105px;">IMPULSE</div>
                    
                    <div id="filter-knob-container" class="knob-container" style="left: 188px;"></div>
                    <div class="control-label" style="top: 150px; left: 188px; width: 105px;">FILTER</div>
                    
                    <div id="feedback-knob-container" class="knob-container" style="left: 353px;"></div>
                    <div class="control-label" style="top: 150px; left: 353px; width: 105px;">FEEDBACK</div>
                    
                    <div id="amplitude-display" class="amplitude-display">
                        <canvas id="amplitude-canvas" class="amplitude-canvas" width="510" height="210"></canvas>
                    </div>
                </div>
                
                <div class="brand-footer">
                    <img src="${dynamicCastBrandingSVG}" alt="Dynamic Cast" style="width: 100%; height: 100%;" />
                </div>
            </div>
        `;
    }

    generateCSS() {
        return `
            <style>
            * {
                user-select: none;
                -webkit-user-select: none;
                box-sizing: border-box;
            }

            .karplus-main-panel {
                width: 570px;
                height: 570px;
                background: linear-gradient(145deg, #2a2a2a, #1a1a1a);
                border-radius: 12px;
                box-shadow: 0 12px 48px rgba(0,0,0,0.3);
                position: relative;
                overflow: visible;
            }

            .control-section {
                position: absolute;
                top: 75px;
                left: 45px;
                right: 45px;
            }

            .knob-container {
                position: absolute;
                top: 30px;
                width: 105px;
                height: 105px;
            }

            .volume-button-knob {
                position: relative;
                width: 105px;
                height: 105px;
                cursor: pointer;
            }

            .volume-button-knob svg {
                display: block;
                width: 100%;
                height: 100%;
            }

            .circle {
                fill: #1a1a1a;
                stroke: #080516;
                stroke-width: 15px;
            }

            .slider-wrap {
                filter: url(#inset-shadow-impulse);
            }

            .slider {
                --deg: 0deg;
                --h: 270;
                --s: 60%;
                transform-origin: 50% 50%;
                transform: rotate(var(--deg));
                fill: rgba(255, 255, 255, 0.5);
                cursor: grab;
                transition: all 0.1s ease-in-out;
                fill: hsl(var(--h), var(--s), 55%);
            }

            .volume-button-knob.without-animate .slider {
                transition: unset;
                cursor: grabbing;
            }

            .gradate line {
                --deg: 0deg;
                --h: 135;
                --s: 10%;
                --a: 0.2;
                stroke-linecap: round;
                stroke-width: 15px;
                stroke: hsla(var(--h), var(--s), 55%, var(--a));
                transform: rotate(var(--deg));
                transform-origin: 50% 50%;
            }

            .gradate line:hover,
            .gradate line.active {
                --a: 1;
                --s: 60%;
                filter: url(#shadow-impulse);
            }

            .title-section {
                position: absolute;
                top: 23px;
                left: 50%;
                transform: translateX(-50%);
                color: #ffffff;
                font-family: 'Arial', sans-serif;
                font-size: 21px;
                font-weight: bold;
                text-align: center;
            }

            .control-label {
                position: absolute;
                top: 150px;
                color: #cccccc;
                font-family: 'Arial', sans-serif;
                font-size: 17px;
                text-align: center;
                width: 105px;
            }

            .brand-footer {
                position: absolute;
                bottom: 3px;
                left: 50%;
                transform: translateX(-50%);
                width: 150px;
                height: 30px;
                opacity: 0.6;
            }

            .amplitude-display {
                position: absolute;
                top: 225px;
                left: 30px;
                right: 30px;
                width: calc(100% - 60px);
                height: 210px;
                overflow: visible;
            }

            .amplitude-canvas {
                width: 100%;
                height: 100%;
                display: block;
                border-radius: 9px;
                image-rendering: pixelated;
                image-rendering: -moz-crisp-edges;
                image-rendering: crisp-edges;
            }
            </style>
        `;
    }

    setupKnobs() {
        const knobConfigs = [
            {
                id: 'impulse-control',
                containerId: 'impulse-knob-container',
                parameterBinding: this.parameterBindings.impulseLength
            },
            {
                id: 'filter-control',
                containerId: 'filter-knob-container',
                parameterBinding: this.parameterBindings.filterFreq
            },
            {
                id: 'feedback-control',
                containerId: 'feedback-knob-container',
                parameterBinding: this.parameterBindings.feedbackAmount
            }
        ];

        knobConfigs.forEach(config => {
            if (config.parameterBinding) {
                this.createKnob(config);
            }
        });
    }

    createKnob(config) {
        const container = this.shadowDOM.getElementById(config.containerId);
        if (!container) return;

        const paramBinding = config.parameterBinding;
        
        const knobController = new KnobController({
            id: config.id,
            minValue: paramBinding.minValue,
            maxValue: paramBinding.maxValue,
            defaultValue: paramBinding.defaultValue,
            startGesture: paramBinding.startGesture,
            updateValue: this.enableRealTimeControl ? 
                paramBinding.updateValue : 
                this.createStatefulUpdater(paramBinding.updateValue, (value) => knobController.updateDisplay(value)),
            endGesture: paramBinding.endGesture,
            enableRealTimeControl: this.enableRealTimeControl
        });

        container.appendChild(knobController.getElement());
        this.knobs.set(config.id, knobController);

        // Set up parameter listener
        const unsubscribe = paramBinding.attachListener?.((value) => {
            knobController.updateDisplay(value);
        });

        if (unsubscribe) {
            this.activeSubscriptions.push(unsubscribe);
        }
    }

    createStatefulUpdater(originalUpdater, displayUpdater) {
        return (newValue) => {
            originalUpdater?.(newValue);
            displayUpdater?.(newValue);
        };
    }

    setupAmplitudeDisplay() {
        if (!this.parameterBindings.amplitude) return;

        const amplitudeCanvas = this.shadowDOM.getElementById("amplitude-canvas");
        if (!amplitudeCanvas) return;

        this.amplitudeDisplay = new AmplitudeDisplay({
            canvas: amplitudeCanvas,
            width: 420,
            height: 210
        });

        // Connect to amplitude data source
        this.amplitudeDisplay.connect(this.parameterBindings.amplitude);
    }

    setupCleanup() {
        this.cleanupCallback = () => {
            this.activeSubscriptions.forEach((cleanup) => cleanup?.());
            this.activeSubscriptions.length = 0;
            
            this.knobs.forEach((knob) => knob.destroy());
            this.knobs.clear();
            
            // Clean up amplitude display
            if (this.amplitudeDisplay) {
                this.amplitudeDisplay.disconnect();
                this.amplitudeDisplay = null;
            }
        };
    }

    connectedCallback() {
        this.initializationCallback?.();
    }

    disconnectedCallback() {
        this.cleanupCallback?.();
    }
}