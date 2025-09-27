import { createKarplusView } from "./controls/view.js";

export default function createPatchView (patchConnection)
{
    const mainContainer = document.createElement ("div");
    
    const clearContainer = () => {
        while (mainContainer.firstChild) {
            mainContainer.removeChild(mainContainer.firstChild);
        }
    };

    patchConnection.addStatusListener ((currentStatus) =>
    {
        clearContainer();

        const createParameterBinding = (targetEndpointID) =>
        {
            const endpointDetails = currentStatus?.details?.inputs?.find (({ endpointID }) => endpointID === targetEndpointID);
            
            if (!endpointDetails) return null;

            const { endpointID } = endpointDetails;

            return {
                minValue: endpointDetails?.annotation?.min,
                maxValue: endpointDetails?.annotation?.max,
                defaultValue: endpointDetails?.annotation?.init,
                startGesture: () => patchConnection.sendParameterGestureStart (endpointID),
                updateValue: (newValue) => patchConnection.sendEventOrValue (endpointID, newValue),
                endGesture: () => patchConnection.sendParameterGestureEnd (endpointID),
                attachListener: (callback) =>
                {
                    patchConnection.addParameterListener (endpointID, callback);
                    patchConnection.requestParameterValue (endpointID);

                    return () => patchConnection.removeParameterListener (endpointID, callback);
                }
            };
        };

        const createAmplitudeBinding = (targetEndpointID) =>
        {
            const endpointDetails = currentStatus?.details?.outputs?.find (({ endpointID }) => endpointID === targetEndpointID);

            if (!endpointDetails) return null;

            return {
                attachListener: (callback) =>
                {
                    patchConnection.addEndpointListener (endpointDetails.endpointID, callback);
                    return () => patchConnection.removeEndpointListener (endpointDetails.endpointID, callback);
                }
            };
        };

        const karplusUI = createKarplusView ({
            impulseLength: createParameterBinding ("impulseLength"),
            filterFreq: createParameterBinding ("filter"),
            feedbackAmount: createParameterBinding ("feedback"),
            amplitude: createAmplitudeBinding ("amplitude"),
        });

        mainContainer.appendChild (karplusUI);
    });

    patchConnection.requestStatusUpdate();
    return mainContainer;
}