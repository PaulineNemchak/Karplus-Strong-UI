export function createKarplusView (parameterBindings, configuration = {})
{
    const elementName = "karplus-strong-interface";

    if (!customElements.get (elementName))
        customElements.define (elementName, KarplusStrongInterface);

    return new KarplusStrongInterface (parameterBindings, configuration);
}

class KarplusStrongInterface extends HTMLElement
{
    constructor (parameterBindings = {}, { enableRealTimeControl = true } = {})
    {
        super();

        const shadowDOM = this.attachShadow ({ mode: "closed" });

        const createRotaryControl = (elementSelector, paramConfig) =>
        {
            return setupRotaryController ({
                ...paramConfig,
                controlElement: shadowDOM.getElementById (elementSelector),
                maxRotationDegrees: 145,
                enableRealTimeControl,
            });
        };

        this.initializationCallback = () =>
        {
            shadowDOM.innerHTML = generateInterfaceHTML();

            const activeSubscriptions = [];

            const bindParameterToControl = (parameterBinding, controlSetupFunction) =>
            {
                const controlUpdater = controlSetupFunction (parameterBinding);
                const unsubscribeFunction = parameterBinding?.attachListener?.(controlUpdater);

                if (unsubscribeFunction)
                    activeSubscriptions.push (unsubscribeFunction);
            };

            bindParameterToControl (parameterBindings.impulseLength, (param) => createRotaryControl ("impulse-control", param));
            bindParameterToControl (parameterBindings.filterFreq, (param) => createRotaryControl ("filter-control", param));
            bindParameterToControl (parameterBindings.feedbackAmount, (param) => createRotaryControl ("feedback-control", param));

            // Setup amplitude display
            if (parameterBindings.amplitude)
            {
                const amplitudeCanvas = shadowDOM.getElementById ("amplitude-canvas");
                const ctx = amplitudeCanvas.getContext('2d');

                const canvasWidth = 280;
                const canvasHeight = 140;

                ctx.imageSmoothingEnabled = false;
                ctx.webkitImageSmoothingEnabled = false;
                ctx.mozImageSmoothingEnabled = false;
                ctx.msImageSmoothingEnabled = false;

                const dpr = window.devicePixelRatio || 1;
                amplitudeCanvas.width = canvasWidth * dpr;
                amplitudeCanvas.height = canvasHeight * dpr;
                amplitudeCanvas.style.width = canvasWidth + 'px';
                amplitudeCanvas.style.height = canvasHeight + 'px';
                ctx.scale(dpr, dpr);

                // Amplitude history buffer
                const historyLength = canvasWidth;
                let amplitudeHistory = new Array(historyLength).fill(0);
                let historyIndex = 0;

                let maxAmplitude = 0.1;
                let scaleUpdateCounter = 0;
                const scaleUpdateInterval = 30;

                const drawAmplitudeDisplay = () => {

                    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
                    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
                    ctx.strokeStyle = '#fefffeff';
                    ctx.lineWidth = 1.5;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.beginPath();
                    
                    let hasStarted = false;
                    for (let i = 0; i < historyLength - 1; i++) {
                        const x = Math.floor(i) + 0.5;
                        const normalizedY = Math.min(1.0, amplitudeHistory[i] / maxAmplitude);
                        const y = Math.floor(canvasHeight - 10 - (normalizedY * (canvasHeight - 30))) + 0.5;
                        
                        if (!hasStarted) {
                            ctx.moveTo(x, y);
                            hasStarted = true;
                        } else {
                            ctx.lineTo(x, y);
                        }
                    }
                    ctx.stroke();

                    const normalizedCurrentY = Math.min(1.0, amplitudeHistory[historyLength - 1] / maxAmplitude);
                    const currentY = Math.floor(canvasHeight - 10 - (normalizedCurrentY * (canvasHeight - 30)));
                    const currentX = Math.floor(canvasWidth - 2);

                    ctx.fillStyle = '#fefffeff';
                    ctx.beginPath();
                    ctx.arc(currentX, currentY, 2, 0, Math.PI * 2);
                    ctx.fill();
                };
                
                const unsubscribeAmplitude = parameterBindings.amplitude.attachListener?.((value) => {
                    const processedValue = Math.pow(value, 0.7) * 1.2;

                    if (processedValue > maxAmplitude) {
                        maxAmplitude = processedValue * 1.1;
                    } else if (scaleUpdateCounter++ > scaleUpdateInterval) {
                        // Gradually reduce max if no peaks for a while
                        const historyMax = Math.max(...amplitudeHistory);
                        if (historyMax < maxAmplitude * 0.7) {
                            maxAmplitude = Math.max(0.1, historyMax * 1.3);
                        }
                        scaleUpdateCounter = 0;
                    }
                    
                    // Shift history buffer and add new value (keep original value, not normalized)
                    amplitudeHistory.shift();
                    amplitudeHistory.push(processedValue);

                    drawAmplitudeDisplay();
                });

                drawAmplitudeDisplay();

                if (unsubscribeAmplitude)
                    activeSubscriptions.push (unsubscribeAmplitude);
            }

            this.cleanupCallback = () =>
            {
                activeSubscriptions.forEach ((cleanup) => cleanup?.());
                activeSubscriptions.length = 0;
            };
        };
    }

    connectedCallback()
    {
        this.initializationCallback?.();
    }

    disconnectedCallback()
    {
        this.cleanupCallback?.();
    }
}

function resolveAssetPath (relativePath)
{
    return new URL (relativePath, import.meta.url);
}

function generateInterfaceHTML()
{
    const dynamicCastBrandingSVG = `data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 40'%3e%3ctext x='50' y='25' font-family='Arial' font-size='18' font-weight='bold' text-anchor='middle' fill='white'%3eDYNAMIC CAST%3c/text%3e%3c/svg%3e`;
    
    return `
<style>
* {
    user-select: none;
    -webkit-user-select: none;
    box-sizing: border-box;
}

.karplus-main-panel {
    width: 380px;
    height: 380px;
    background: linear-gradient(145deg, #2a2a2a, #1a1a1a);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    position: relative;
    overflow: visible;
}

.control-section {
    position: absolute;
    top: 50px;
    left: 30px;
    right: 30px;
}

.rotary-knob {
    width: 70px;
    height: 70px;
    background-image: url(${resolveAssetPath ("./big-knob-flat.svg")});
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
    cursor: pointer;
}

.small-knob {
    width: 55px;
    height: 55px;
    background-image: url(${resolveAssetPath ("./smaller-knob-flat.svg")});
}

.title-section {
    position: absolute;
    top: 15px;
    left: 50%;
    transform: translateX(-50%);
    color: #ffffff;
    font-family: 'Arial', sans-serif;
    font-size: 14px;
    font-weight: bold;
    text-align: center;
}

#impulse-control {
    position: absolute;
    top: 20px;
    left: 10%;
}

#filter-control {
    position: absolute;
    top: 20px;
    left: 40%;
    transform: translateX(-50%);
}

#feedback-control {
    position: absolute;
    top: 20px;
    left: 70%;
}

.control-label {
    position: absolute;
    top: 100px;
    left: 50%;
    transform: translateX(-50%);
    color: #cccccc;
    font-family: 'Arial', sans-serif;
    font-size: 11px;
    text-align: center;
    width: 80px;
}

.brand-footer {
    position: absolute;
    bottom: 2px;
    left: 50%;
    transform: translateX(-50%);
    width: 100px;
    height: 20px;
    opacity: 0.6;
}

.amplitude-display {
    position: absolute;
    top: 150px;
    left: 20px;
    right: 20px;
    width: calc(100% - 40px);
    height: 140px;
    background: rgba(0, 0, 0, 0.4);
    border-radius: 6px;
    border: 1px solid #444;
    overflow: visible;
}

.amplitude-canvas {
    width: 100%;
    height: 100%;
    display: block;
    image-rendering: pixelated;
    image-rendering: -moz-crisp-edges;
    image-rendering: crisp-edges;
}

</style>

<div class="karplus-main-panel">
    <div class="title-section">KARPLUS-STRONG</div>
    
    <div class="control-section">
        <div id="impulse-control" class="rotary-knob"></div>
        <div class="control-label" style="top: 100px; left: 10%; transform: none;">IMPULSE</div>
        
        <div id="filter-control" class="rotary-knob"></div>
        <div class="control-label" style="top: 100px; left: 50%; transform: translateX(-50%);">FILTER</div>
        
        <div id="feedback-control" class="rotary-knob"></div>
        <div class="control-label" style="top: 100px; left: 70%; transform: none;">FEEDBACK</div>
        
        <div id="amplitude-display" class="amplitude-display">
            <canvas id="amplitude-canvas" class="amplitude-canvas" width="340" height="140"></canvas>
        </div>
    </div>
    
    <div class="brand-footer">
        <img src="${dynamicCastBrandingSVG}" alt="Dynamic Cast" style="width: 100%; height: 100%;" />
    </div>
</div>
    `;
}

function setupRotaryController ({
    defaultValue,
    minValue = 0,
    maxValue = 1,
    startGesture = () => {},
    updateValue = () => {},
    endGesture = () => {},
    maxRotationDegrees = 140,
    controlElement,
    enableRealTimeControl = true,
} = {})
{
    defaultValue = defaultValue ?? minValue;

    const mapValueToRotation = (inputValue) => {
        const normalizedValue = (inputValue - minValue) / (maxValue - minValue);
        return (normalizedValue * 2 - 1) * maxRotationDegrees;
    };
    
    const mapRotationToValue = (rotationDegrees) => {
        const normalizedRotation = rotationDegrees / maxRotationDegrees;
        return minValue + (normalizedRotation + 1) * 0.5 * (maxValue - minValue);
    };

    const controlState = { currentRotation: undefined };

    const updateControlDisplay = (nextValue, forceUpdate = false) =>
    {
        const targetRotation = mapValueToRotation (nextValue);

        if (!forceUpdate && controlState.currentRotation === targetRotation) 
            return;

        controlState.currentRotation = targetRotation;
        controlElement.style.transform = `rotate(${targetRotation}deg)`;
    };

    const createStatefulUpdater = (controlledMode, originalUpdater, displayUpdater) =>
    {
        if (controlledMode)
            return originalUpdater;

        return (newValue) =>
        {
            originalUpdater?.(newValue);
            displayUpdater?.(newValue);
        };
    };

    updateValue = createStatefulUpdater (enableRealTimeControl, updateValue, updateControlDisplay);

    updateControlDisplay (defaultValue, true);

    let accumulatedRotation;

    const handleMouseMovement = (mouseEvent) =>
    {
        mouseEvent.preventDefault();

        const calculateNextRotation = (currentRotation, deltaY) =>
        {
            const clampValue = (val, min, max) => Math.min (Math.max (val, min), max);
            return clampValue (currentRotation - deltaY, -maxRotationDegrees, maxRotationDegrees);
        };

        const sensitivity = mouseEvent.shiftKey ? 0.3 : 1.8;
        accumulatedRotation = calculateNextRotation (accumulatedRotation, mouseEvent.movementY * sensitivity);
        updateValue?.(mapRotationToValue (accumulatedRotation));
    };

    const handleMouseRelease = () =>
    {
        accumulatedRotation = undefined;
        window.removeEventListener ("mousemove", handleMouseMovement);
        window.removeEventListener ("mouseup", handleMouseRelease);
        endGesture?.();
    };

    const handleMousePress = () =>
    {
        accumulatedRotation = controlState.currentRotation;
        startGesture?.();
        window.addEventListener ("mousemove", handleMouseMovement);
        window.addEventListener ("mouseup", handleMouseRelease);
    };

    const handleDoubleClick = () => {
        startGesture?.();
        updateValue?.(defaultValue);
        endGesture?.();
    };

    controlElement.addEventListener ("mousedown", handleMousePress);
    controlElement.addEventListener ("dblclick", handleDoubleClick);

    return updateControlDisplay;
}