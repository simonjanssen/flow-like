import { spawn } from "child_process";
import { arch, platform } from "os";

function getConfigPath(): string {
	const osType = platform();
	const architecture = arch();

	let configPath = "";

	switch (osType) {
		case "darwin": // macOS
			configPath =
				architecture === "arm64"
					? "src-tauri/configs/tauri.macos.arm.conf.json"
					: "src-tauri/configs/tauri.macos.intel.conf.json";
			break;
		case "win32": // Windows
			configPath =
				architecture === "arm64"
					? "src-tauri/configs/tauri.win.arm.conf.json"
					: "src-tauri/configs/tauri.win.x64.conf.json";
			break;
		case "linux": // Linux
			configPath = "src-tauri/configs/tauri.linux.x64.conf.json";
			break;
		default:
			throw new Error(`Unsupported platform: ${osType}`);
	}

	return configPath;
}

function shouldRunTranslationServer(): boolean {
	const osType = platform();
	// Only run translation server on macOS and Linux
	return osType === "darwin" || osType === "linux";
}

async function main() {
	try {
		const configPath = getConfigPath();
		console.log(`Detected OS: ${platform()}, Architecture: ${arch()}`);
		console.log(`Using config: ${configPath}`);

		if (shouldRunTranslationServer()) {
			console.log(`Starting Tauri dev with config and translation server...`);

			// Start translation server
			const translationServer = spawn(
				"bun",
				["run", "--watch", "./scripts/translation-server.ts"],
				{
					stdio: "inherit",
				},
			);

			// Start tauri dev
			const tauriDev = spawn(
				"bun",
				[
					"run",
					"tauri",
					"dev",
					"+nightly",
					"-d",
					"-b",
					"none",
					"--config",
					configPath,
				],
				{
					stdio: "inherit",
				},
			);

			// Handle process cleanup
			process.on("SIGINT", () => {
				console.log("\nShutting down...");
				translationServer.kill();
				tauriDev.kill();
				process.exit(0);
			});
		} else {
			console.log(`Starting Tauri dev with config...`);

			// Run only tauri dev
			const tauriDev = spawn(
				"bun",
				[
					"run",
					"tauri",
					"dev",
					"+nightly",
					"-d",
					"-b",
					"none",
					"--config",
					configPath,
				],
				{
					stdio: "inherit",
				},
			);

			process.on("SIGINT", () => {
				console.log("\nShutting down...");
				tauriDev.kill();
				process.exit(0);
			});
		}
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
}

main();
