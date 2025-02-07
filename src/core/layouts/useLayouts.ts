import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { clone, pick } from "lodash";

import { useAtom } from "../utils/atoms";
import { graphDatasetAtom } from "../graph";
import { useSigmaGraph } from "../context/dataContexts";
import { useNotifications } from "../notifications";
import { WorkerSupervisorInterface } from "./types";
import { LAYOUTS } from "./collection";

export function useLayouts() {
  const { t } = useTranslation();
  const { notify } = useNotifications();
  const sigmaGraph = useSigmaGraph();
  const [, setGraphDataset] = useAtom(graphDatasetAtom);
  const [supervisor, setSupervisor] = useState<WorkerSupervisorInterface | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  /**
   * When supervisor change
   *  => we stop/kill the worker if needed and save the position
   */
  useEffect(() => {
    return () => {
      if (supervisor) {
        supervisor.stop();
        supervisor.kill();

        // Save data
        setGraphDataset((graphDataset) => {
          const nodeRenderingData = sigmaGraph.reduceNodes((acc, nodeId, attrs) => {
            acc[nodeId] = {
              ...(graphDataset.nodeRenderingData[nodeId] || {}),
              ...pick(attrs, ["x", "y"]),
            };
            return acc;
          }, graphDataset.nodeRenderingData);
          return {
            ...graphDataset,
            nodeRenderingData,
          };
        });

        notify({
          type: "info",
          message: t("layouts.exec.stopped", { layout: "" }).toString(),
          title: t("layouts.title") as string,
        });
      }
    };
  }, [supervisor, setGraphDataset, sigmaGraph, t, notify]);

  const stop = useCallback(() => {
    setSupervisor(null);
    setIsRunning(false);
  }, []);

  const start = useCallback(
    (id: string, params: any) => {
      setIsRunning(true);
      setSupervisor(null);

      // search the layout
      const layout = LAYOUTS.find((l) => l.id === id);

      // Sync layout
      if (layout && layout.type === "sync") {
        // generate positions
        const positions = layout.run(sigmaGraph, { settings: params });

        // Save it
        setGraphDataset((graphDataset) => {
          // write them into NodeRenderingData
          const nodeRenderingData = clone(graphDataset.nodeRenderingData);

          // Iterate over position
          Object.keys(positions).forEach((nodeId) => {
            if (nodeRenderingData[nodeId] && positions[nodeId]) {
              nodeRenderingData[nodeId] = {
                ...nodeRenderingData[nodeId],
                ...positions[nodeId],
              };
            }
          });

          return {
            ...graphDataset,
            nodeRenderingData,
          };
        });

        setIsRunning(false);
      }

      // Sync layout
      if (layout && layout.type === "worker") {
        const worker = new layout.supervisor(sigmaGraph, { settings: params });
        worker.start();
        setSupervisor(worker);
      }
    },
    [sigmaGraph, setGraphDataset],
  );

  return { isRunning, start, stop };
}
