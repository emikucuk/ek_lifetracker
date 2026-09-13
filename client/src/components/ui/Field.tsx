import { FormControl, FormHelperText, FormLabel } from "@chakra-ui/react";
import type { ReactNode } from "react";

interface FieldProps {
  label: string;
  helper?: string;
  children: ReactNode;
}

export function Field({ label, helper, children }: FieldProps) {
  return (
    <FormControl>
      <FormLabel>{label}</FormLabel>
      {children}
      {helper ? <FormHelperText color="ink.400">{helper}</FormHelperText> : null}
    </FormControl>
  );
}
