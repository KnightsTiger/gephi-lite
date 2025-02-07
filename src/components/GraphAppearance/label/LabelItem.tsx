import { FC, useMemo } from "react";
import Select from "react-select";
import { useTranslation } from "react-i18next";

import { ItemType } from "../../../core/types";
import { useAppearance, useAppearanceActions, useGraphDataset } from "../../../core/context/dataContexts";
import { FieldModel } from "../../../core/graph/types";

type LabelOption =
  | { value: string; type: "none" | "data" | "fixed"; field?: undefined; label: string }
  | { value: string; type: "field"; field: string; label: string };

export const LabelItem: FC<{ itemType: ItemType }> = ({ itemType }) => {
  const { t } = useTranslation();
  const { nodeFields, edgeFields } = useGraphDataset();
  const { nodesLabel, edgesLabel } = useAppearance();
  const { setLabelAppearance } = useAppearanceActions();

  const allFields: FieldModel[] = itemType === "nodes" ? nodeFields : edgeFields;
  const labelsDef = itemType === "nodes" ? nodesLabel : edgesLabel;
  const labelOptions = useMemo(() => {
    return [
      { value: "data", type: "data", label: t("appearance.labels.data") as string },
      ...allFields.map((field) => ({
        value: `field::${field.id}`,
        type: "field",
        field: field.id,
        label: field.id,
      })),
      { value: "fixed", type: "fixed", label: t("appearance.labels.fixed") as string },
      { value: "none", type: "none", label: t("appearance.labels.none") as string },
    ] as LabelOption[];
  }, [allFields, t]);
  const selectedLabelOption: LabelOption | null = useMemo(
    () => labelOptions.find((option) => option.type === labelsDef.type && option.field === labelsDef.field) || null,
    [labelOptions, labelsDef.field, labelsDef.type],
  );

  return (
    <>
      <h3 className="fs-5 mt-3">{t("appearance.labels.title")}</h3>
      <label htmlFor={`${itemType}-labelsMode`}>{t("appearance.labels.set_labels_from")}</label>
      <Select<LabelOption>
        id={`${itemType}-labelsMode`}
        options={labelOptions}
        value={selectedLabelOption}
        onChange={(option) => {
          if (!option) {
            setLabelAppearance(itemType, {
              type: "none",
            });
          } else if (option.type === "field") {
            setLabelAppearance(itemType, {
              type: "field",
              field: option.field,
              missingLabel: null,
            });
          } else if (option.type === "fixed") {
            setLabelAppearance(itemType, {
              type: "fixed",
              value: "label",
            });
          } else {
            setLabelAppearance(itemType, {
              type: option.type,
            });
          }
        }}
      />

      {labelsDef.type === "data" && (
        <p className="fst-italic text-muted small mt-1">
          {t("appearance.labels.data_description", { items: t(`graph.model.${itemType}`) })}
        </p>
      )}
      {labelsDef.type === "none" && (
        <p className="fst-italic text-muted small mt-1">
          {t("appearance.labels.none_description", { items: t(`graph.model.${itemType}`) })}
        </p>
      )}
      {labelsDef.type === "field" && (
        <div className="d-flex align-items-center mt-1">
          <input
            className="form-control form-control-sm w-8"
            type="string"
            value={labelsDef.missingLabel || ""}
            onChange={(v) => setLabelAppearance(itemType, { ...labelsDef, missingLabel: v.target.value || null })}
            id={`${itemType}-missingLabel`}
          />
          <label className="form-check-label small ms-1" htmlFor={`${itemType}-missingLabel`}>
            {t("appearance.labels.default_value", { items: t(`graph.model.${itemType}`) })}
          </label>
        </div>
      )}
      {labelsDef.type === "fixed" && (
        <div className="d-flex align-items-center mt-1">
          <input
            className="form-control form-control-sm w-8"
            type="string"
            value={labelsDef.value}
            onChange={(v) => setLabelAppearance(itemType, { ...labelsDef, value: v.target.value })}
            id={`${itemType}-fixedLabel`}
          />
          <label className="form-check-label small ms-1" htmlFor={`${itemType}-fixedLabel`}>
            {t("appearance.labels.fixed_label", { items: t(`graph.model.${itemType}`) })}
          </label>
        </div>
      )}
    </>
  );
};
