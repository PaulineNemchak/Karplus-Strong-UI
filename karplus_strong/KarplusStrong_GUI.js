

// This is the web-component that we'll return for our patch's view
class KarplusView extends HTMLElement
{
    constructor (patchConnection)
    {
        super();
        this.patchConnection = patchConnection;
        this.Controls = this.patchConnection.utilities.ParameterControls;
        this.classList = "karplus-main";
        this.innerHTML = this.getHTML();
    }

    connectedCallback()
    {
        // To connect some controls to our parameters, we need to wait for the status info
        // to arrive when our patch connection is established.
        // This listener will get called when that happens, so that it can create some
        // parameter controls and add them to our panel..
        this.statusListener = status =>
        {
            this.status = status;

            const paramControlHolder = this.querySelector ("#karplus-parameters");
            paramControlHolder.innerHTML = ""; // delete any old controls before adding new ones

             const length = this.Controls.createLabelledControlForEndpointID(this.patchConnection, status, "impulseLength");
             paramControlHolder.appendChild(length);

             const filter = this.Controls.createLabelledControlForEndpointID(this.patchConnection, status, "filter");
             paramControlHolder.appendChild(filter);

             const feedback = this.Controls.createLabelledControlForEndpointID(this.patchConnection, status, "feedback");
             paramControlHolder.appendChild(feedback);
        };

        this.patchConnection.addStatusListener (this.statusListener);
        this.patchConnection.requestStatusUpdate();

        // when our two trigger buttons are pushed, we'll send events to the patch to trigger playback..
       // this.querySelector ("#playSample1").onclick = () => { this.patchConnection.sendEventOrValue ("triggerSample", 0); };
        //this.querySelector ("#playSample2").onclick = () => { this.patchConnection.sendEventOrValue ("triggerSample", 1); };
    }

    getHTML()
    {
        return `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
            
            .karplus-main {
                background-color: white;
                color: black;
                display: block;
                padding: 1rem;
            }

            .karplus-main * {
                --knob-dial-background-color: transparent;
                --knob-dial-border-color: black;
                --knob-dial-tick-color: black;
                font-family: "Inter", Arial, sans-serif;
            }

            .karplus-controls input {
                font-size: 1rem;
                display: inline;
                padding: 0.5rem;
            }

            .karplus-controls p {
                text-align: center;
                font-size: 1.25rem;
                margin: 0.25rem;
                display: inline-flex;
                align-items: center;
                justify-content: center;
            }

            .title-image {
            height: 2.5rem;
            margin-right: 2rem;
            width: 50%;
            height: 50%;
            }

            .karplus-controls #karplus-parameters {
            font-weight: 500;
                display: flex;
                justify-content: space-around;
                align-items: center;
                width: 100%;
                margin: 1rem 0;
            }

            .button-row {
              display: flex;
              justify-content: space-around;
              margin: 1rem 0;
            }

            .note-button {
              background-color: #eee;
              border: 1px solid #999;
              border-radius: 4px;
              padding: 0.5rem 1rem;
              font-family: "Inter", Arial, sans-serif;
              font-size: 1rem;
              cursor: pointer;
              transition: background-color 0.2s;
              color:rgb(0, 0, 0);
            }

            .note-button:hover {
              background-color: #ddd;
            }

            ${this.Controls.getAllCSS()}
        </style>

        <div class="karplus-controls">
         <p>Karplus Strong String Synthesis</p>
         <div id="karplus-parameters"></div>
        </div>
        <div class="button-row">
        <button id="playC" class="note-button">Play C</button>
        <button id="playE" class="note-button">Play E</button>
        <button id="playG" class="note-button">Play G</button>
        </div>`;
    }
}


/* This is the function that a host (the command line patch player, or a Cmajor plugin
   loader, or our VScode extension, etc) will call in order to create a view for your patch.

   Ultimately, a DOM element must be returned to the caller for it to append to its document.
   However, this function can be `async` if you need to perform asyncronous tasks, such as
   fetching remote resources for use in the view, before completing.

   When using libraries such as React, this is where the call to `ReactDOM.createRoot` would
   go, rendering into a container component before returning.
*/
export default function createPatchView (patchConnection)
{
    const customElementName = "karplus-view";

    if (! window.customElements.get (customElementName))
        window.customElements.define (customElementName, KarplusView);

    return new (window.customElements.get (customElementName)) (patchConnection);
}