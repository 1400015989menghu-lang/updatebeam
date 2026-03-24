import type * as React from "react";

type ValidatableField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export function setEnglishValidationMessage(
  event: React.InvalidEvent<ValidatableField>,
  label: string,
) {
  const field = event.currentTarget;

  if (field.validity.valueMissing) {
    field.setCustomValidity(`${label} is required.`);
    return;
  }

  if (field.validity.typeMismatch) {
    if (field instanceof HTMLInputElement && field.type === "email") {
      field.setCustomValidity("Enter a valid email address.");
      return;
    }

    if (field instanceof HTMLInputElement && field.type === "url") {
      field.setCustomValidity("Enter a valid URL.");
      return;
    }
  }

  field.setCustomValidity("Please check this field.");
}

export function clearEnglishValidationMessage(
  event: React.FormEvent<ValidatableField> | React.ChangeEvent<ValidatableField>,
) {
  event.currentTarget.setCustomValidity("");
}
