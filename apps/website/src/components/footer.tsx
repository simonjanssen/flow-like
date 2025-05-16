export function Footer() {
	return (
		<footer className="w-full flex flex-row items-center absolute bottom-0 left-0 right-0 h-10 z-20 bg-transparent justify-start px-2 gap-2">
			<a href="https://good-co.de/eula" target="_blank" rel="noreferrer">
				<small>EULA</small>
			</a>
			<a
				href="https://good-co.de/privacy-policy"
				target="_blank"
				rel="noreferrer"
			>
				<small>Privacy Policy</small>
			</a>
			<a
				href="https://good-co.de/legal-notice"
				target="_blank"
				rel="noreferrer"
			>
				<small>Legal Notice</small>
			</a>
		</footer>
	);
}
