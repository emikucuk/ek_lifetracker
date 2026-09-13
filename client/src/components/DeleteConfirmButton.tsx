import {
  Box,
  Button,
  HStack,
  IconButton,
  Portal,
  Text,
  type IconButtonProps,
} from "@chakra-ui/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FiTrash2 } from "react-icons/fi";

interface DeleteConfirmButtonProps {
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
  ariaLabel?: string;
  message?: string;
  size?: IconButtonProps["size"];
}

export function DeleteConfirmButton({
  onConfirm,
  isLoading = false,
  ariaLabel = "Sil",
  message = "Emin misiniz?",
  size = "sm",
}: DeleteConfirmButtonProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({ top: rect.top, left: rect.right });
  }, []);

  useEffect(() => {
    if (!open) return;

    updatePosition();

    function handleOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (bubbleRef.current?.contains(target)) return;
      setOpen(false);
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, updatePosition]);

  async function handleConfirm() {
    await onConfirm();
    setOpen(false);
  }

  return (
    <>
      <IconButton
        ref={triggerRef}
        aria-label={ariaLabel}
        aria-expanded={open}
        icon={<FiTrash2 />}
        size={size}
        variant="ghost"
        colorScheme="red"
        isLoading={isLoading && !open}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          updatePosition();
          setOpen(true);
        }}
      />
      {open && (
        <Portal>
          <Box
            ref={bubbleRef}
            className="delete-confirm-bubble"
            position="fixed"
            top={`${coords.top}px`}
            left={`${coords.left}px`}
            transform="translate(-100%, calc(-100% - 10px))"
            zIndex={1400}
            role="dialog"
            aria-label="Silme onayı"
          >
            <Text fontSize="sm" fontWeight="600" color="ink.800" lineHeight="1.4">
              {message}
            </Text>
            <HStack spacing={2} justify="flex-end" mt={2}>
              <Button size="xs" variant="ghost" onClick={() => setOpen(false)}>
                İptal
              </Button>
              <Button
                size="xs"
                colorScheme="red"
                background={"red.600"}
                isLoading={isLoading}
                onClick={() => void handleConfirm()}
              >
                Sil
              </Button>
            </HStack>
          </Box>
        </Portal>
      )}
    </>
  );
}
