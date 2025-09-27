// filepath: karplus_strong/ui/controls/view.js
/**
 * Custom Karplus Strong synthesizer interface
 * Features controls for impulse length, filter frequency, and feedback amount
 */

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
    width: 280px;
    height: 350px;
    background: linear-gradient(145deg, #2a2a2a, #1a1a1a);
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    position: relative;
    overflow: hidden;
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
    left: 20px;
}

#filter-control {
    position: absolute;
    top: 20px;
    right: 20px;
}

#feedback-control {
    position: absolute;
    top: 120px;
    left: 50%;
    transform: translateX(-50%);
}

.control-label {
    position: absolute;
    top: 80px;
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
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    width: 100px;
    height: 20px;
    opacity: 0.6;
}
</style>

<div class="karplus-main-panel">
    <div class="title-section">KARPLUS-STRONG</div>
    
    <div class="control-section">
        <div id="impulse-control" class="rotary-knob"></div>
        <div class="control-label" style="top: 100px; left: 15px;">IMPULSE</div>
        
        <div id="filter-control" class="rotary-knob"></div>
        <div class="control-label" style="top: 100px; right: 15px;">FILTER</div>
        
        <div id="feedback-control" class="rotary-knob small-knob"></div>
        <div class="control-label" style="top: 200px; left: 50%; transform: translateX(-50%);">FEEDBACK</div>
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