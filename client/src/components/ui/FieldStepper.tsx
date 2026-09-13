import { HStack, IconButton, Text } from "@chakra-ui/react";
import { FiMinus, FiPlus } from "react-icons/fi";

interface FieldStepperProps {
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  isDisabled?: boolean;
  placeholder?: string;
}

export function FieldStepper({
  value,
  onChange,
  min = 0,
  max = 999,
  isDisabled = false,
  placeholder = "0",
}: FieldStepperProps) {
  const current = value ?? 0;

  function bump(delta: number) {
    if (isDisabled) return;
    const next = Math.min(max, Math.max(min, current + delta));
    onChange(next);
  }

  return (
    <HStack
      className={`field-shell${isDisabled ? " is-disabled" : ""}`}
      spacing={0}
      px={1}
      justify="space-between"
    >
      <IconButton
        aria-label="Azalt"
        icon={<FiMinus />}
        size="sm"
        variant="ghost"
        borderRadius="xl"
        color="ink.600"
        _hover={{ bg: "brand.500", color: "canvas.100" }}
        isDisabled={isDisabled || current <= min}
        onClick={() => bump(-1)}
      />
      <Text
        flex={1}
        textAlign="center"
        fontWeight="700"
        fontSize="md"
        color={value == null ? "ink.300" : "ink.900"}
        sx={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value == null ? placeholder : value}
      </Text>
      <IconButton
        aria-label="Artır"
        icon={<FiPlus />}
        size="sm"
        variant="ghost"
        borderRadius="xl"
        color="ink.600"
        _hover={{ bg: "brand.500", color: "canvas.100" }}
        isDisabled={isDisabled || current >= max}
        onClick={() => bump(1)}
      />
    </HStack>
  );
}
