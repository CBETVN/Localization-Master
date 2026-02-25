import { photoshop } from "../globals";
// import { asModal as executeAsModal } from "./utils/photoshop-utils.js";

const { action } = photoshop;
const { batchPlay } = action;
const { app } = photoshop;
const { executeAsModal } = photoshop.core;



export const notify = async (message) => {
  await photoshop.app.showAlert(message);
};

export const getProjectInfo = async () => {
  const doc = photoshop.app.activeDocument;
  const info = {
    name: doc.name,
    path: doc.path,
    id: doc.id,
  };
  return info;
};






export async function translateSmartObject(smartObject, translation) {
  const smartObjectId = smartObject.id;

  try {
    await executeAsModal(async () => {
      await batchPlay([{
        _obj: "select",
        _target: [{ _ref: "layer", _id: smartObjectId }],
        _options: { dialogOptions: "silent" }
      }], { synchronousExecution: true });

      const allDocLayers = getAllLayers(app.activeDocument.layers);
      const freshSmartObject = allDocLayers.find(l => l.id === smartObjectId);

      if (!freshSmartObject) {
        console.error("Could not find smart object with id:", smartObjectId);
        return;
      }

      console.log("Entering edit mode for Smart Object:", freshSmartObject.name);
      await editSmartObject(freshSmartObject);

      // Fetch all inner layers and their info in one shot AFTER opening the SO
      const allLayers = getAllLayers(app.activeDocument.layers);
      const allInnerInfos = await batchPlay(
        allLayers.map(l => ({ _obj: "get", _target: [{ _ref: "layer", _id: l.id }] })),
        { synchronousExecution: true }
      );

      // Translate all text layers, reusing allInnerInfos for font size
      for (let i = 0; i < allLayers.length; i++) {
        const layer = allLayers[i];
        if (layer.kind !== "text") continue;

        const originalSize = allInnerInfos[i].textKey.textStyleRange[0].textStyle.impliedFontSize._value;

        layer.textItem.contents = translation;
        app.activeDocument.activeLayers = [layer];

        await batchPlay([{
          _obj: "set",
          _target: [
            { _ref: "property", _property: "textStyle" },
            { _ref: "textLayer", _enum: "ordinal", _value: "targetEnum" }
          ],
          to: {
            _obj: "textStyle",
            textOverrideFeatureName: 808465458,
            typeStyleOperationType: 3,
            size: { _unit: "pointsUnit", _value: originalSize }
          },
          _options: { dialogOptions: "dontDisplay" }
        }], { synchronousExecution: true });
      }

      await cropCanvasToLayerBounds(allLayers, allInnerInfos);

      await app.activeDocument.save();
      app.activeDocument.closeWithoutSaving();

    }, { commandName: "Translate Smart Object" });

  } catch (e) {
    console.error("Error in executeAsModal:", e);
  }
}




//Takes a layer as a parameter and enters edit mode. Doesnt preform a check so make sure layer is in fact SMart object.
export async function editSmartObject(smartObject) {
    // if (smartObject.kind !== "smartObject") {
    //   photoshop.app.showAlert("No layer provided.");
    //   return;
    // }
    console.log("MUH EDITING:", smartObject.name);
   const result = await batchPlay(
      [
         {
            _obj: "placedLayerEditContents",
            documentID: app.activeDocument.id,
            layerID: smartObject.id,
            _options: {
               dialogOptions: "dontDisplay"
            }
         }
      ],
      {}
   );
}


//Gets the font size of a text layer in real "points" units instead of weird Photoshop units (2.1356666 and such)
async function getFontSizeInPT(layer) {
  let actualFontSize; // Declare outside executeAsModal
  
  await executeAsModal(async () => {
    const layerInfo = await batchPlay([{
      _obj: "get",
      _target: [{ _ref: "layer", _id: layer.id }]
    }], { synchronousExecution: true });

    actualFontSize = layerInfo[0].textKey.textStyleRange[0].textStyle.impliedFontSize._value;
  });
  
  return actualFontSize;
}


// ??? Function to change text size of a text layer to a specific value in points/TO BE TESTED/
async function changeTextSize(number) {
  executeAsModal(async () => {
    const result = await batchPlay(
      [
         {
            _obj: "set",
            _target: [
               {
                  _ref: "property",
                  _property: "textStyle"
               },
               {
                  _ref: "textLayer",
                  _enum: "ordinal",
                  _value: "targetEnum"
               }
            ],
            to: {
               _obj: "textStyle",
               textOverrideFeatureName: 808465458,
               typeStyleOperationType: 3,
               size: {
                  _unit: "pointsUnit",
                  _value: number
               }
            },
            _options: {
               dialogOptions: "dontDisplay"
            }
         }
      ],
      {
         synchronousExecution: true,
        //  modalBehavior: "wait"
      }
   );})
}


export async function getLayerInfo(layer) {
  if (!layer) {
    console.error("No layer selected.");
    return null;
  }

  const res = await batchPlay(
    [
      {
        _obj: "get",
        _target: [
          { _ref: "layer", _id: layer.id }
        ]
      }
    ],
    { synchronousExecution: true }
  );

  const layerInfo = res[0];

  // Uncomment the line below to log the entire layer info object

  // console.log("Layer info:", JSON.stringify(layerInfo, null, 2));

  // if(layerInfo.hasOwnProperty("layerSectionExpanded")) {
  //   const isExpanded = layerInfo.layerSectionExpanded;
  //   if (isExpanded) {
  //     console.log(`Group IS Expanded`);
  //   }else{ console.log(`Group IS NOT Expanded`); }
  // }

  return layerInfo;
}

// Helper function to recursively get all layers including nested ones
export function getAllLayers(layers) {
  let allLayers = [];
  for (const layer of layers) {
    allLayers.push(layer);
    // If it's a group, get its children too
    if (layer.layers && layer.layers.length > 0) {
      allLayers = allLayers.concat(getAllLayers(layer.layers));
    }
  }
  return allLayers;
}



export function getAllVisibleLayers(layers, result = []) {
  for (const layer of layers) {
    if (!layer.visible) continue; // skip invisible layer AND its entire subtree
    result.push(layer);
    if (layer.layers?.length) getAllVisibleLayers(layer.layers, result);
  }
  console.log(`Found ${result.length} visible layers in total.`);
  return result;
}







/**
 * Returns all layers that share the same Smart Object ID as the given layer.
 * Operates entirely in memory using pre-fetched layer data — no Photoshop API calls.
 *
 * @param {Layer} layer - The reference Smart Object layer to match against.
 * @param {Layer[]} allLayers - Flat array of all document layers (from getAllLayers).
 * @param {Object[]} allInfos - batchPlay info objects for all layers, same order as allLayers.
 * @param {Map<number, number>} layerIndexMap - Map of layer.id -> index in allLayers for O(1) lookup.
 * @returns {Layer[]|null} Array of matching instances, or null if the layer is not a Smart Object.
 */
export function getSmartObjectInstances(layer, allLayers, allInfos, layerIndexMap) {
  const idx = layerIndexMap.get(layer.id);
  const layerInfo = allInfos[idx];

  if (!layerInfo.smartObjectMore) {
    console.log(`Layer "${layer.name}" is not a Smart Object.`);
    return null;
  }

  const targetSOid = layerInfo.smartObjectMore.ID;

  const instances = allLayers.filter((l, i) => allInfos[i].smartObjectMore?.ID === targetSOid);

  console.log(`Found ${instances.length} instance(s) of "${layer.name}"`);
  return instances;
}


export function getParentFolder(layer) {
  // console.log("Checking:", layer.name);
  // console.log("Layer is part of the group:", layer.parent.name);
  try {
    if (!layer.parent) {
      // console.log("Layer has no parent.");
      return null;
    } else {
      // console.log("Parent folder is:", layer.parent.name);
      return layer.parent;
    }
  } catch (error) {
    console.error("Error accessing parent folder:", error);
  }

}

// Check if layer is a group and has layers in it
export function isLayerAGroup(layer) {
    if(layer.kind === "group" && layer.layers.length > 0) {
      // console.log(`Layer: ${layer.name} is a group/folder`);
      return true;
    }
  // if(layer.kind === "group") {
  //   return true;
  // }
  return false;
}




/**
 * Crops the canvas of the active document to the bounds of the most relevant layer.
 * Prefers the first layer with at least one enabled effect (e.g. drop shadow, gradient, stroke).
 * Falls back to the first text layer if no such layer is found.
 * Designed to be called from within an existing executeAsModal context.
 *
 * @param {Layer[]} allLayers - Flat array of all layers inside the Smart Object.
 * @param {Object[]} allInnerInfos - batchPlay info objects for each layer, same order as allLayers.
 */
export async function cropCanvasToLayerBounds(allLayers, allInnerInfos) {
  function hasEnabledEffects(layerEffects) {
    if (!layerEffects) return false;
    return Object.values(layerEffects).some(val => {
      if (Array.isArray(val)) return val.some(e => e.enabled);
      if (typeof val === 'object' && val !== null) return val.enabled === true;
      return false;
    });
  }

  const cropTarget =
    allLayers.find((l, i) => hasEnabledEffects(allInnerInfos[i]?.layerEffects)) ??
    allLayers.find(l => l.kind === "text");

  if (!cropTarget) {
    console.warn("No suitable crop target found in:", app.activeDocument.name);
    return;
  }

  const { left, top, right, bottom } = cropTarget.bounds;

  await batchPlay([
    {
      _obj: "set",
      _target: [{ _ref: "channel", _property: "selection" }],
      to: {
        _ref: [
          { _ref: "channel", _enum: "channel", _value: "transparencyEnum" },
          { _ref: "layer", _name: cropTarget.name }
        ]
      }
    },
    {
      _obj: "crop",
      to: {
        _obj: "rectangle",
        top:    { _unit: "pixelsUnit", _value: top },
        left:   { _unit: "pixelsUnit", _value: left },
        bottom: { _unit: "pixelsUnit", _value: bottom },
        right:  { _unit: "pixelsUnit", _value: right }
      },
      angle: { _unit: "angleUnit", _value: 0 },
      delete: true,
      AutoFillMethod: 1,
      cropFillMode: { _enum: "cropFillMode", _value: "defaultFill" },
      cropAspectRatioModeKey: { _enum: "cropAspectRatioModeClass", _value: "pureAspectRatio" },
      constrainProportions: false
    }
  ], { synchronousExecution: true });

  console.log(`Cropped canvas to layer: "${cropTarget.name}"`);
}