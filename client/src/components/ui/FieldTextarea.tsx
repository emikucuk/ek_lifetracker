import { Box } from "@chakra-ui/react";
import { useState, type FocusEvent, type TextareaHTMLAttributes } from "react";

interface FieldTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  isDisabled?: boolean;
}

export function FieldTextarea({
  isDisabled,
  className,
  onFocus,
  onBlur,
  rows = 3,
  style,
  ...props
}: FieldTextareaProps) {
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
    <Box className={shellClass} px={4} py={3} minH="auto">
      <textarea
        rows={rows}
        disabled={isDisabled}
        style={{
          width: "100%",
          border: "none",
          outline: "none",
          background: "transparent",
          font: "inherit",
          fontSize: "0.875rem",
          fontWeight: 600,
          color: "inherit",
          resize: "vertical",
          ...style,
        }}
        onFocus={(e: FocusEvent<HTMLTextAreaElement>) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e: FocusEvent<HTMLTextAreaElement>) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
    </Box>
  );
}
