import { useState, useCallback } from "react";

export type PrivacyProvider = "proton" | "tuta" | "internxt";

export interface ConnectedAccount {
  provider: PrivacyProvider;
  connectedAt: number;
}

const STORAGE_KEY = "void-browser:privacy-hub";

const PROVIDER_META: Record<
  PrivacyProvider,
  { name: string; color: string; homeUrl: string; loginUrl: string; services: { name: string; url: string }[] }
> = {
  proton: {
    name: "Proton",
    color: "#6D4AFF",
    homeUrl: "https://proton.me",
    loginUrl: "https://account.proton.me/login",
    services: [
      { name: "Mail", url: "https://mail.proton.me" },
      { name: "Calendar", url: "https://calendar.proton.me" },
      { name: "Drive", url: "https://drive.proton.me" },
      { name: "VPN", url: "https://account.proton.me/vpn-dashboard" },
    ],
  },
  tuta: {
    name: "Tuta",
    color: "#FF0000",
    homeUrl: "https://tuta.com",
    loginUrl: "https://app.tuta.com",
    services: [
      { name: "Mail", url: "https://app.tuta.com" },
      { name: "Calendar", url: "https://app.tuta.com/calendar" },
      { name: "Contacts", url: "https://app.tuta.com/contact" },
    ],
  },
  internxt: {
    name: "Internxt",
    color: "#0066FF",
    homeUrl: "https://internxt.com",
    loginUrl: "https://drive.internxt.com/login",
    services: [
      { name: "Drive", url: "https://drive.internxt.com/app" },
      { name: "Photos", url: "https://photos.internxt.com" },
      { name: "Send", url: "https://send.internxt.com" },
    ],
  },
};

function loadAccounts(): ConnectedAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is ConnectedAccount =>
        a && typeof a.provider === "string" && typeof a.connectedAt === "number"
    );
  } catch {
    return [];
  }
}

function saveAccounts(accounts: ConnectedAccount[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
  } catch {
    // ignore
  }
}

export function usePrivacyHub() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>(loadAccounts);

  const connect = useCallback((provider: PrivacyProvider) => {
    setAccounts((prev) => {
      if (prev.some((a) => a.provider === provider)) return prev;
      const next = [...prev, { provider, connectedAt: Date.now() }];
      saveAccounts(next);
      return next;
    });
  }, []);

  const disconnect = useCallback((provider: PrivacyProvider) => {
    setAccounts((prev) => {
      const next = prev.filter((a) => a.provider !== provider);
      saveAccounts(next);
      return next;
    });
  }, []);

  const isConnected = useCallback(
    (provider: PrivacyProvider) => accounts.some((a) => a.provider === provider),
    [accounts]
  );

  return { accounts, connect, disconnect, isConnected, PROVIDER_META };
}
