import { ItemType } from "../types";
import { DatalessGraph } from "../graph/types";

export interface BaseFilter {
  type: string;
  itemType: ItemType;
}

export type RangeFilterType = BaseFilter & {
  type: "range";
  itemType: ItemType;
  field: string;
} & { min?: number; max?: number };

export interface TermsFilterType extends BaseFilter {
  type: "terms";
  itemType: ItemType;
  field: string;
  terms?: Set<string>;
}

export interface TopologicalFilterType {
  type: "topological";
  method?: string; // TODO
  arguments?: any; // TODO
}

export interface ScriptFilterType extends BaseFilter {
  type: "script";
  itemType: ItemType;
  script?: (itemID: string) => boolean;
}

export type FilterType = RangeFilterType | TermsFilterType | TopologicalFilterType | ScriptFilterType;

export interface FiltersState {
  past: FilterType[];
  future: FilterType[];
}

/**
 * Filtering steps:
 * ****************
 */
export interface FilteredGraph {
  filterFingerprint: string;
  graph: DatalessGraph;
}
