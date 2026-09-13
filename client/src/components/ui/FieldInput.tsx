import { Box } from "@chakra-ui/react";
import { useState, type FocusEvent, type InputHTMLAttributes } from "react";

interface FieldInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  isDisabled?: boolean;
}

export function FieldInput({
  isDisabled,
  className,
  onFocus,
  onBlur,
  style,
  ...props
}: FieldInputProps) {
  const [focused, setFocused] = useState(false);
  const shellClass = [
    "field-shell",
    focused ? "is-focused" : "",
    isDisabled ? "is-disabled" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Box className={shellClass} display="flex" alignItems="center" px={4}>
      <input
        style={{
          width: "100%",
          border: "none",
          outline: "none",
          background: "transparent",
          font: "inherit",
          fontSize: "0.875rem",
          fontWeight: 600,
          color: "inherit",
          ...style,
        }}
        disabled={isDisabled}
        onFocus={(e: FocusEvent<HTMLInputElement>) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e: FocusEvent<HTMLInputElement>) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
    </Box>
  );
}
