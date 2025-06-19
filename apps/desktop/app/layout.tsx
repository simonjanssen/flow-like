"use client";
import "@tm9657/flow-like-ui/globals.css";
import {
	PersistQueryClientProvider,
	QueryClient,
	ReactFlowProvider,
} from "@tm9657/flow-like-ui";
import { ThemeProvider } from "@tm9657/flow-like-ui/components/theme-provider";
import { Toaster } from "@tm9657/flow-like-ui/components/ui/sonner";
import { TooltipProvider } from "@tm9657/flow-like-ui/components/ui/tooltip";
import { createIDBPersister } from "@tm9657/flow-like-ui/lib/persister";
import { Inter } from "next/font/google";
import { AppSidebar } from "../components/app-sidebar";
import { DesktopAuthProvider } from "../components/auth-provider";
import GlobalAnchorHandler from "../components/global-anchor-component";
import { TauriProvider } from "../components/tauri-provider";
import ToastProvider from "../components/toast-provider";
import PostHogPageView from "./PostHogPageView";
import { ReactScan } from "./ReactScanComponent";
import { PHProvider } from "./provider";

const inter = Inter({ subsets: ["latin"] });

const persister = createIDBPersister();
const queryClient = new QueryClient();

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning suppressContentEditableWarning>
			{/* <ReactScan /> */}
			<PHProvider>
			<ReactFlowProvider>
				<PersistQueryClientProvider
					client={queryClient}
					persistOptions={{
						persister,
					}}
				>
					<body className={inter.className}>
						<GlobalAnchorHandler />
						<ThemeProvider
							attribute="class"
							defaultTheme="system"
							enableSystem
							storageKey="theme"
							disableTransitionOnChange
						>
							<TooltipProvider>
								<Toaster />
								<ToastProvider />
								<TauriProvider>
									<DesktopAuthProvider>
										<PostHogPageView />
										<AppSidebar>{children}</AppSidebar>
									</DesktopAuthProvider>
								</TauriProvider>
							</TooltipProvider>
						</ThemeProvider>
					</body>
				</PersistQueryClientProvider>
			</ReactFlowProvider>
			</PHProvider>
		</html>
	);
}
