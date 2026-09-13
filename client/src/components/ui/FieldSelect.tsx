import { Box, HStack, Text } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";
import { FiCheck, FiChevronDown } from "react-icons/fi";

export interface FieldSelectOption<T extends string = string> {
  value: T;
  label: string;
}

interface FieldSelectProps<T extends string = string> {
  value: T;
  options: Array<FieldSelectOption<T>>;
  onChange: (value: T) => void;
  placeholder?: string;
  isDisabled?: boolean;
}

export function FieldSelect<T extends string = string>({
  value,
  options,
  onChange,
  placeholder = "Seç",
  isDisabled = false,
}: FieldSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (isDisabled) setOpen(false);
  }, [isDisabled]);

  return (
    <Box ref={rootRef} position="relative">
      <HStack
        as="button"
        type="button"
        className={`field-shell${open ? " is-focused" : ""}${isDisabled ? " is-disabled" : ""}`}
        w="full"
        px={4}
        justify="space-between"
        cursor={isDisabled ? "not-allowed" : "pointer"}
        onClick={() => {
          if (!isDisabled) setOpen((prev) => !prev);
        }}
      >
        <Text fontSize="sm" fontWeight="600" color={selected ? "ink.900" : "ink.300"}>
          {selected?.label ?? placeholder}
        </Text>
        <Box
          color="ink.400"
          transform={open ? "rotate(180deg)" : "none"}
          transition="transform 200ms cubic-bezier(0.22, 1, 0.36, 1)"
        >
          <FiChevronDown size={16} />
        </Box>
      </HStack>

      {open && (
        <Box className="field-select-menu" role="listbox">
          {options.map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={active}
                className={`field-select-option${active ? " is-active" : ""}`}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <HStack w="full" justify="space-between">
                  <span>{option.label}</span>
                  {active ? <FiCheck size={14} /> : null}
                </HStack>
              </button>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
