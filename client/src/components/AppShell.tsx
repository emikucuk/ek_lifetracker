import { Box, Flex, HStack, Text, VStack } from "@chakra-ui/react";
import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { FiCalendar, FiCheckSquare, FiHome, FiInbox, FiList, FiSearch, FiSettings } from "react-icons/fi";
import { EntryEditDrawer } from "./EntryEditDrawer";
import { useEntryKeyboardShortcuts } from "../hooks/useEntryKeyboardShortcuts";
import { useReminderNotifications } from "../hooks/useReminderNotifications";

const NAV = [
  { to: "/", label: "Bugün", short: "Bugün", icon: FiHome },
  { to: "/inbox", label: "Gelen", short: "Gelen", icon: FiInbox },
  { to: "/agenda", label: "Gündem", short: "Gündem", icon: FiList },
  { to: "/search", label: "Ara", short: "Ara", icon: FiSearch },
  { to: "/review", label: "Gözden geçir", short: "Geçir", icon: FiCheckSquare },
  { to: "/calendar", label: "Takvim", short: "Takvim", icon: FiCalendar },
  { to: "/settings", label: "Ayarlar", short: "Ayar", icon: FiSettings },
] as const;

const WIDE_PATHS = ["/calendar", "/settings"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEntryKeyboardShortcuts();
  useReminderNotifications();

  const isWide = WIDE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  return (
    <Flex className="app-canvas" minH="100vh">
      <Box
        as="aside"
        display={{ base: "none", md: "flex" }}
        w="var(--sidebar-width)"
        flexDirection="column"
        borderRight="1px solid"
        borderColor="blackAlpha.100"
        px={4}
        py={6}
        gap={6}
        position="sticky"
        top={0}
        h="100vh"
        flexShrink={0}
      >
        <Box px={2}>
          <Text className="page-title" fontSize="2xl" color="brand.500">
            EK Life
          </Text>
          <Text fontSize="sm" color="ink.400" mt={1}>
            Her şey burada.
          </Text>
        </Box>
        <VStack align="stretch" spacing={1}>
          {NAV.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link key={item.to} to={item.to} className={`sidebar-nav-item${active ? " is-active" : ""}`}>
                <span className="nav-icon">
                  <Icon size={16} />
                </span>
                {item.label}
              </Link>
            );
          })}
        </VStack>
      </Box>

      <Box flex={1} minW={0} pb={{ base: "88px", md: 0 }}>
        <Box
          as="main"
          className={isWide ? "main-wide" : "main-narrow"}
          px={{ base: 3, md: isWide ? 5 : 8 }}
          py={{ base: 4, md: 7 }}
          maxW={isWide ? "100%" : "1100px"}
          w="100%"
        >
          {children}
        </Box>
      </Box>

      <HStack
        display={{ base: "flex", md: "none" }}
        position="fixed"
        bottom={0}
        insetX={0}
        bg="white"
        borderTop="1px solid"
        borderColor="blackAlpha.100"
        px={1}
        py={2}
        justify="space-around"
        zIndex={20}
        style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom))" }}
      >
        {NAV.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to}>
              <VStack spacing={0.5} color={active ? "brand.500" : "ink.400"} minW="48px">
                <Icon size={18} />
                <Text fontSize="10px" fontWeight="700" lineHeight="1.1">
                  {item.short}
                </Text>
              </VStack>
            </Link>
          );
        })}
      </HStack>

      <EntryEditDrawer />
    </Flex>
  );
}
