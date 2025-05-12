import { Button } from "@tm9657/flow-like-ui";
import { BsDiscord, BsTwitterX } from "react-icons/bs";
import { LuBookMarked } from "react-icons/lu";
import { VscGithubInverted } from "react-icons/vsc";

export function Header() {
	return (
		<header className="w-full flex flex-row items-center absolute top-0 left-0 right-0 h-16 z-20 backdrop-blur-sm shadow-md bg-background/40 justify-between">
			<div className="flex flex-row items-center px-2 gap-2">
				<img alt="logo" src="/icon.webp" className="h-10 w-10" />
				<h3>Flow Like</h3>
			</div>
			<div className="flex flex-row items-center px-2 gap-2">
				<a href="https://github.com/TM9657/flow-like" target="_blank">
					<Button variant={"outline"} size={"icon"}>
						<VscGithubInverted width={6} height={6} className="w-6 h-6"/>
					</Button>
				</a>
				<a href="https://x.com/tm9657" target="_blank">
					<Button variant={"outline"} size={"icon"}>
						<BsTwitterX width={6} height={6} className="w-6 h-6"/>
					</Button>
				</a>
				<a href="https://discord.com/invite/KTWMrS2/" target="_blank">
					<Button variant={"outline"} size={"icon"}>
						<BsDiscord width={6} height={6} className="w-6 h-6"/>
					</Button>
				</a>
				<a href="https://docs.flow-like.com" target="_blank">
					<Button>
						<LuBookMarked className="w-4 h-4" />
						Docs
					</Button>
				</a>
			</div>
		</header>
	);
}
