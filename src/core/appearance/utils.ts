import { Settings } from "sigma/settings";
import drawLabel from "sigma/rendering/canvas/label";
import drawHover from "sigma/rendering/canvas/hover";
import drawEdgeLabel from "sigma/rendering/canvas/edge-label";
import { EdgeDisplayData, NodeDisplayData } from "sigma/types";
import chroma from "chroma-js";
import { forEach } from "lodash";

import { AppearanceState, ColorGetter, EdgeColor, LabelGetter, SizeGetter, VisualGetters } from "./types";
import { EdgeRenderingData, GraphDataset, ItemData, NodeRenderingData, SigmaGraph } from "../graph/types";
import { toNumber, toString } from "../utils/casting";
import { parse, stringify } from "../utils/json";

export const DEFAULT_NODE_COLOR = "#999999";
export const DEFAULT_EDGE_COLOR = "#cccccc";
export const DEFAULT_NODE_SIZE = 6;
export const DEFAULT_EDGE_SIZE = 1;
export const DEFAULT_NODE_LABEL_SIZE = 14;
export const DEFAULT_EDGE_LABEL_SIZE = 14;

export function getEmptyAppearanceState(): AppearanceState {
  return {
    showEdges: true,
    nodesSize: {
      type: "data",
    },
    edgesSize: {
      type: "data",
    },
    nodesColor: {
      type: "data",
    },
    edgesColor: {
      type: "data",
    },
    nodesLabel: {
      type: "data",
    },
    edgesLabel: {
      type: "data",
    },
    nodesLabelSize: {
      type: "fixed",
      value: DEFAULT_NODE_LABEL_SIZE,
    },
    edgesLabelSize: {
      type: "fixed",
      value: DEFAULT_EDGE_LABEL_SIZE,
    },
  };
}

export function getEmptyVisualGetters(): VisualGetters {
  return {
    getNodeSize: null,
    getNodeColor: null,
    getNodeLabel: null,
    getEdgeSize: null,
    getEdgeColor: null,
    getEdgeLabel: null,
  };
}

/**
 * Appearance lifecycle helpers (state serialization / deserialization):
 */
export function serializeAppearanceState(appearance: AppearanceState): string {
  return stringify(appearance);
}
export function parseAppearanceState(rawAppearance: string): AppearanceState | null {
  try {
    // TODO:
    // Validate the actual data
    return parse(rawAppearance);
  } catch (e) {
    return null;
  }
}

/**
 * Actual appearance helpers:
 */
export function makeGetSize<
  T extends { itemType: "nodes"; displayData: NodeDisplayData } | { itemType: "edges"; displayData: EdgeDisplayData },
>(
  itemType: T["itemType"],
  { nodeData, edgeData, fullGraph }: GraphDataset,
  { nodesSize, edgesSize }: AppearanceState,
): null | SizeGetter {
  const itemsValues = itemType === "nodes" ? nodeData : edgeData;
  const sizesDef = itemType === "nodes" ? nodesSize : edgesSize;

  let getSize: SizeGetter | null = null;
  switch (sizesDef.type) {
    case "ranking": {
      let min = Infinity,
        max = -Infinity;
      forEach(itemsValues, (data) => {
        const value = toNumber(data[sizesDef.field]);
        if (typeof value === "number") {
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      });
      const delta = max - min || 1;
      const ratio = (sizesDef.maxSize - sizesDef.minSize) / delta;
      getSize = (_itemId: string, data: ItemData) => {
        const value = toNumber(data[sizesDef.field]);
        if (typeof value === "number") {
          // TODO: Handle transformation method
          return (value - min) * ratio + sizesDef.minSize;
        }
        return sizesDef.missingSize;
      };
      break;
    }
    case "fixed":
      getSize = () => sizesDef.value;
  }

  return getSize;
}

export function makeGetColor<
  T extends { itemType: "nodes"; displayData: NodeDisplayData } | { itemType: "edges"; displayData: EdgeDisplayData },
>(
  itemType: T["itemType"],
  { nodeData, edgeData, fullGraph }: GraphDataset,
  { nodesColor, edgesColor }: AppearanceState,
  getters?: VisualGetters,
): ColorGetter | null {
  const itemsValues = itemType === "nodes" ? nodeData : edgeData;
  const colorsDef = itemType === "nodes" ? nodesColor : edgesColor;

  let getColor: ((itemId: string, data: ItemData) => string) | null = null;
  switch (colorsDef.type) {
    case "partition":
      getColor = (_itemId: string, data: ItemData) => {
        const value = data[colorsDef.field] as string;
        return value in colorsDef.colorPalette ? colorsDef.colorPalette[value] : colorsDef.missingColor;
      };
      break;
    case "ranking": {
      let min = Infinity,
        max = -Infinity;
      forEach(itemsValues, (data) => {
        const value = toNumber(data[colorsDef.field]);
        if (typeof value === "number") {
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      });
      const delta = max - min || 1;
      // TODO: Handle irregular domains
      const colorScale = chroma.scale(colorsDef.colorScalePoints.map((point) => point.color));
      getColor = (_itemId: string, data: ItemData) => {
        const value = toNumber(data[colorsDef.field]);
        if (typeof value === "number") {
          return colorScale((value - min) / delta).hex();
        }
        return colorsDef.missingColor;
      };
      break;
    }
    case "fixed":
      getColor = () => colorsDef.value;
  }

  if (itemType === "edges") {
    const getNodeColor = (getters as VisualGetters | undefined)?.getNodeColor;
    switch ((colorsDef as EdgeColor).type) {
      case "source":
        getColor = (edgeId: string) => {
          const node = fullGraph.source(edgeId);
          return getNodeColor ? getNodeColor(node, nodeData[node]) : DEFAULT_NODE_COLOR;
        };
        break;
      case "target":
        getColor = (edgeId: string) => {
          const node = fullGraph.target(edgeId);
          return getNodeColor ? getNodeColor(node, nodeData[node]) : DEFAULT_NODE_COLOR;
        };
        break;
    }
  }

  return getColor;
}

export function makeGetLabel<
  T extends { itemType: "nodes"; displayData: NodeDisplayData } | { itemType: "edges"; displayData: EdgeDisplayData },
>(
  itemType: T["itemType"],
  { nodeData, edgeData, fullGraph, nodeRenderingData }: GraphDataset,
  { nodesLabel, edgesLabel }: AppearanceState,
): LabelGetter | null {
  const labelsDef = itemType === "nodes" ? nodesLabel : edgesLabel;

  let getLabel: LabelGetter | null = null;
  switch (labelsDef.type) {
    case "none":
      getLabel = () => null;
      break;
    case "fixed":
      getLabel = () => labelsDef.value;
      break;
    case "field":
      getLabel = (_itemId: string, data: ItemData) => {
        const label = toString(data[labelsDef.field]);
        return typeof label === "string" ? label : labelsDef.missingLabel;
      };
      break;
  }

  return getLabel;
}

export function getAllVisualGetters(dataset: GraphDataset, appearance: AppearanceState): VisualGetters {
  const nodeVisualGetters: VisualGetters = {
    getNodeSize: makeGetSize("nodes", dataset, appearance),
    getNodeColor: makeGetColor("nodes", dataset, appearance),
    getNodeLabel: makeGetLabel("nodes", dataset, appearance),
    getEdgeSize: null,
    getEdgeColor: null,
    getEdgeLabel: null,
  };

  return {
    ...nodeVisualGetters,
    getEdgeSize: makeGetSize("edges", dataset, appearance),
    getEdgeColor: makeGetColor("edges", dataset, appearance, nodeVisualGetters),
    getEdgeLabel: makeGetLabel("edges", dataset, appearance),
  };
}
export function applyVisualProperties(graph: SigmaGraph, dataset: GraphDataset, getters: VisualGetters): void {
  graph.forEachNode((node) => {
    const attr: Partial<NodeRenderingData> = {};
    if (getters.getNodeSize) attr.size = getters.getNodeSize(node, dataset.nodeData[node]);
    if (getters.getNodeColor) attr.color = getters.getNodeColor(node, dataset.nodeData[node]);
    if (getters.getNodeLabel) attr.label = getters.getNodeLabel(node, dataset.nodeData[node]);
    graph.mergeNodeAttributes(node, attr);
  });

  graph.forEachEdge((edge) => {
    const attr: Partial<EdgeRenderingData> = {};
    if (getters.getEdgeSize) attr.size = getters.getEdgeSize(edge, dataset.edgeData[edge]);
    if (getters.getEdgeColor) attr.color = getters.getEdgeColor(edge, dataset.edgeData[edge]);
    if (getters.getEdgeLabel) attr.label = getters.getEdgeLabel(edge, dataset.edgeData[edge]);
    graph.mergeEdgeAttributes(edge, attr);
  });
}

/**
 * Rendering helpers:
 */
export function getDrawLabel({ nodesLabelSize }: AppearanceState): typeof drawLabel {
  if (nodesLabelSize.type === "fixed") {
    return (context, data, settings) => drawLabel(context, data, { ...settings, labelSize: nodesLabelSize.value });
  } else {
    return (context, data, settings) =>
      drawLabel(context, data, {
        ...settings,
        labelSize: (nodesLabelSize.adaptsToZoom ? data.size : (data.rawSize as number)) * nodesLabelSize.coef,
      });
  }
}

export function getDrawHover({ nodesLabelSize }: AppearanceState): typeof drawHover {
  if (nodesLabelSize.type === "fixed") {
    return (context, data, settings) => drawHover(context, data, { ...settings, labelSize: nodesLabelSize.value });
  } else {
    return (context, data, settings) =>
      drawHover(context, data, {
        ...settings,
        labelSize: (nodesLabelSize.adaptsToZoom ? data.size : (data.rawSize as number)) * nodesLabelSize.coef,
      });
  }
}

export function getDrawEdgeLabel({ edgesLabelSize }: AppearanceState): typeof drawEdgeLabel {
  if (edgesLabelSize.type === "fixed") {
    return (context, data, sourceData, targetData, settings: Settings) =>
      drawEdgeLabel(context, data, sourceData, targetData, { ...settings, edgeLabelSize: edgesLabelSize.value });
  } else {
    return (context, data, sourceData, targetData, settings: Settings) =>
      drawEdgeLabel(context, data, sourceData, targetData, {
        ...settings,
        edgeLabelSize: (edgesLabelSize.adaptsToZoom ? data.size : (data.rawSize as number)) * edgesLabelSize.coef,
      });
  }
}
