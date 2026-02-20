import { photoshop } from "../globals";

const { action } = photoshop;
const { batchPlay } = action;

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

export async function doesSelectedSOhaveInstances(layer) {
  // Get the target layer's info
  if (!layer) {
    layer = photoshop.app.activeDocument.activeLayers[0];
  }
  
  const layerInfo = await getLayerInfo(layer);
  
  // Check if it's a SmartObject
  if (!layerInfo.smartObject) {
    console.log("This is not a SmartObject");
    return { isSmartObject: false, instances: [] };
  }
  
  const targetSOid = layerInfo.smartObjectMore.ID;
  
  console.log("Looking for instances of:", layer.name, "and SmartObject ID:", targetSOid);
  
  // Get all layers in the document (including nested)
  const doc = photoshop.app.activeDocument;
  const allLayers = getAllLayers(doc.layers);
  
  // Check each layer to see if it shares the same SmartObject ID
  const instances = [];
  
  for (const l of allLayers) {
    const info = await getLayerInfo(l);
    
    if (info && info.smartObjectMore?.ID === targetSOid) {
      instances.push({
        id: l.id,
        name: l.name
      });
    }
  }
  
  console.log(`Found ${instances.length} instance(s)`);
  
  return {
    isSmartObject: true,
    smartObjectID: targetSOid,
    instanceCount: instances.length,
    instances: instances
  };
}

// export async function findSmartObjectInstances(targetLayerId) {
//   // Get all layers
//   const allLayersInfo = await batchPlay([
//     {
//       _obj: "get",
//       _target: [{ _ref: "document", _enum: "ordinal", _value: "targetEnum" }]
//     }
//   ], { synchronousExecution: true });

//   // Then iterate through layers and compare smartObject.documentID or smartObjectMore.placed
//   // Count how many have the same ID
// }


export function getParentFolder(layer) {
  // console.log("Checking:", layer.name);
  // console.log("Layer is part of the group:", layer.parent.name);
  try {
    if (!layer.parent) {
      // console.log("Layer has no parent.");
      return null;
    } else {
      // console.log("Parent folder is:", layer.parent.name);
      return layer.parent.name;
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