import { Button } from "@tm9657/flow-like-ui";
import { BsDiscord, BsTwitterX } from "react-icons/bs";
import { LuBookMarked } from "react-icons/lu";
import { VscGithubInverted } from "react-icons/vsc";

export function Footer() {
	return (
		<footer className="w-full flex flex-row items-center absolute bottom-0 left-0 right-0 h-10 z-20 bg-transparent justify-start px-2 gap-2">
			<a href="https://good-co.de/eula" target="_blank">
				<small>
					EULA
					</small>
			</a>
			<a href="https://good-co.de/privacy-policy" target="_blank">
				<small>
				Privacy Policy
				</small>
			</a>
			<a href="https://good-co.de/legal-notice" target="_blank">
				<small>
				Legal Notice
				</small>
			</a>
		</footer>
	);
}
