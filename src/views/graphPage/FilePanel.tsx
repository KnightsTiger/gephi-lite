import { FC } from "react";
import { useTranslation } from "react-i18next";
import { FaDownload, FaRegFolderOpen, FaRegSave } from "react-icons/fa";

import { FileIcon } from "../../components/common-icons";
import { SaveCloudFileModal } from "./modals/save/SaveCloudFileModal";
import { CloudFileModal } from "./modals/open/CloudFileModal";
import { LocalFileModal } from "./modals/open/LocalFileModal";
import { RemoteFileModal } from "./modals/open/RemoteFileModal";
import { useModal } from "../../core/modals";
import { useConnectedUser } from "../../core/user";
import { useNotifications } from "../../core/notifications";
import { useGraphDataset } from "../../core/context/dataContexts";
import { useCloudProvider } from "../../core/cloud/useCloudProvider";
import { useExportAsGexf } from "../../core/graph/useExportAsGexf";
import { Loader } from "../../components/Loader";
import { SignInModal } from "../../components/user/SignInModal";

export const FilePanel: FC = () => {
  const { openModal } = useModal();
  const [user] = useConnectedUser();
  const { notify } = useNotifications();
  const { t } = useTranslation("translation");
  const { origin } = useGraphDataset();
  const { loading, saveFile } = useCloudProvider();
  const { loading: ldExportGexf, downloadAsGexf } = useExportAsGexf();

  return (
    <div>
      <h2 className="fs-4">
        <FileIcon className="me-1" /> {t("file.title")}
      </h2>

      {!user?.provider ? (
        <>
          <hr />
          <p className="small">{t("file.login_capabilities")}</p>
          <div>
            <button
              className="btn btn-sm btn-outline-dark mb-1"
              onClick={() => openModal({ component: SignInModal, arguments: {} })}
            >
              <FaRegSave className="me-1" />
              {t("auth.sign_in")}
            </button>
          </div>
          <hr />
        </>
      ) : (
        <hr />
      )}

      <div className="position-relative">
        <h3 className="fs-5 mt-3">{t("graph.save.title")}</h3>
        {/* Save links */}
        {user && user.provider && (
          <>
            {origin && origin.type === "cloud" && (
              <div>
                <button
                  className="btn btn-sm btn-outline-dark mb-1"
                  onClick={async () => {
                    try {
                      await saveFile();
                      notify({
                        type: "success",
                        message: t("graph.save.cloud.success", { filename: origin.filename }).toString(),
                      });
                    } catch (e) {
                      notify({ type: "error", message: t("graph.save.cloud.error").toString() });
                    }
                  }}
                >
                  <FaRegSave className="me-1" />
                  {t("menu.save.default").toString()}
                </button>
              </div>
            )}
            <div>
              <button
                className="btn btn-sm btn-outline-dark mb-1"
                onClick={() => {
                  openModal({ component: SaveCloudFileModal, arguments: {} });
                }}
              >
                <FaRegSave className="me-1" />
                {t("menu.save.cloud", { provider: t(`providers.${user.provider.type}`) }).toString()}
              </button>
            </div>
            <div>
              <hr className="dropdown-divider" />
            </div>
          </>
        )}
        <div>
          <button
            className="btn btn-sm btn-outline-dark mb-1"
            onClick={async () => {
              try {
                await downloadAsGexf();
              } catch (e) {
                console.error(e);
                notify({ type: "error", message: t("menu.download.gexf-error").toString() });
              }
            }}
          >
            <FaDownload className="me-1" />
            {t("menu.download.gexf").toString()}
          </button>
        </div>

        {/* Open links */}
        <h3 className="fs-5 mt-3">{t("graph.open.title")}</h3>
        {user && user.provider && (
          <div>
            <button
              className="btn btn-sm btn-outline-dark mb-1"
              onClick={() => {
                openModal({ component: CloudFileModal, arguments: {} });
              }}
            >
              <FaRegFolderOpen className="me-1" />
              {t(`menu.open.cloud`, { provider: t(`providers.${user.provider.type}`) }).toString()}
            </button>
          </div>
        )}
        <div>
          <button
            className="btn btn-sm btn-outline-dark mb-1"
            onClick={() => {
              openModal({ component: LocalFileModal, arguments: {} });
            }}
          >
            <FaRegFolderOpen className="me-1" />
            {t(`menu.open.local`).toString()}
          </button>
        </div>
        <div>
          <button
            className="btn btn-sm btn-outline-dark mb-1"
            onClick={() => {
              openModal({ component: RemoteFileModal, arguments: {} });
            }}
          >
            <FaRegFolderOpen className="me-1" />
            {t(`menu.open.remote`).toString()}
          </button>
        </div>

        {(loading || ldExportGexf) && <Loader />}
      </div>
    </div>
  );
};
