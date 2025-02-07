import Sigma from "sigma";
import cx from "classnames";
import { useTranslation } from "react-i18next";
import { SigmaContainer, useSigma } from "@react-sigma/core";
import React, { FC, useCallback, useEffect, useState } from "react";

import { FaRegDotCircle } from "react-icons/fa";
import { BsZoomIn, BsZoomOut } from "react-icons/bs";
import { AiOutlineFullscreen, AiOutlineFullscreenExit } from "react-icons/ai";

import { sigmaAtom } from "../../core/graph";
import { SigmaGraph } from "../../core/graph/types";
import { getDrawEdgeLabel, getDrawHover, getDrawLabel } from "../../core/appearance/utils";
import { useAppearance, useGraphDataset, useSigmaAtom, useSigmaGraph } from "../../core/context/dataContexts";

const SettingsController: FC<{ setIsReady: () => void }> = ({ setIsReady }) => {
  const sigma = useSigma();
  const graphDataset = useGraphDataset();
  const graphAppearance = useAppearance();

  useEffect(() => {
    sigmaAtom.set(sigma as Sigma<SigmaGraph>);
  }, [sigma]);

  useEffect(() => {
    sigma.setSetting("renderEdgeLabels", graphAppearance.edgesLabel.type !== "none");
    sigma.setSetting("labelRenderer", getDrawLabel(graphAppearance));
    sigma.setSetting("hoverRenderer", getDrawHover(graphAppearance));
    sigma.setSetting("edgeLabelRenderer", getDrawEdgeLabel(graphAppearance));
    setIsReady();
  }, [graphAppearance, graphDataset, setIsReady, sigma]);

  return null;
};

function useFullScreen(): { toggle: () => void; isFullScreen: boolean } {
  const [isFullScreen, setFullScreen] = useState<boolean>(false);
  const container = document.body;

  useEffect(() => {
    const toggleState = () => setFullScreen((v) => !v);
    document.addEventListener("fullscreenchange", toggleState);
    return () => document.removeEventListener("fullscreenchange", toggleState);
  }, []);

  const toggle = useCallback(() => {
    if (document.fullscreenElement !== container) {
      container.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }, [container]);

  return {
    toggle,
    isFullScreen,
  };
}

const InteractionsController: FC = () => {
  const { t } = useTranslation();
  const { isFullScreen, toggle } = useFullScreen();
  const sigma = useSigmaAtom();

  const btnClassName = "btn btn-ico btn-dark btn-sm mt-1";
  const zoomOptions = { duration: 200, factor: 1.5 };

  return (
    <div className="position-absolute d-flex flex-column" style={{ right: 10, bottom: 10 }}>
      <button
        className={btnClassName}
        onClick={() => sigma.getCamera().animatedZoom(zoomOptions)}
        title={t("graph.control.zoomIn").toString()}
      >
        <BsZoomIn />
      </button>
      <button
        className={btnClassName}
        onClick={() => sigma.getCamera().animatedUnzoom(zoomOptions)}
        title={t("graph.control.zoomOut").toString()}
      >
        <BsZoomOut />
      </button>
      <button
        className={btnClassName}
        onClick={() => sigma.getCamera().animatedReset(zoomOptions)}
        title={t("graph.control.zoomReset").toString()}
      >
        <FaRegDotCircle />
      </button>
      <button
        className={btnClassName}
        onClick={() => toggle()}
        title={
          isFullScreen ? t("graph.control.fullscreenExit").toString() : t("graph.control.fullscreenEnter").toString()
        }
      >
        {isFullScreen ? <AiOutlineFullscreenExit /> : <AiOutlineFullscreen />}
      </button>
    </div>
  );
};

export const GraphRendering: FC = () => {
  const sigmaGraph = useSigmaGraph();
  const [isReady, setIsReady] = useState(false);

  return (
    <div className="stage">
      <SigmaContainer
        className={cx("position-absolute inset-0", !isReady && "visually-hidden")}
        graph={sigmaGraph}
        settings={{
          labelFont: "Poppins, Arial, Helvetica, Geneva",
          edgeLabelFont: "Poppins, Arial, Helvetica, Geneva",
        }}
      >
        <SettingsController setIsReady={() => setIsReady(true)} />
      </SigmaContainer>
      <InteractionsController />
    </div>
  );
};
