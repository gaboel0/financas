"use client";

import type { ReactNode } from "react";
import type { ActionResult } from "@/server/actions/util";
import { FormDialog, useDialog } from "./FormDialog";

/** Botão que abre um formulário em modal ligado a uma server action. */
export function DialogButton({
  label, title, action, submitLabel, className, children,
}: {
  label: ReactNode;
  title: string;
  action: (fd: FormData) => Promise<ActionResult>;
  submitLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  const d = useDialog();
  return (
    <>
      <button type="button" onClick={d.show} className={className}>{label}</button>
      <FormDialog open={d.open} onClose={d.hide} title={title} action={action} submitLabel={submitLabel}>
        {children}
      </FormDialog>
    </>
  );
}
