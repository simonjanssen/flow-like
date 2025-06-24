import {
	useCallback,
	useEffect,
	useMemo,
	useState,
	useTransition,
} from "react";
import * as jsxRuntime from "react/jsx-runtime";
import rehypeKatex from "rehype-katex";
import rehypeReact, { type Options as RehypeReactOptions } from "rehype-react";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse, { type Options as RemarkParseOptions } from "remark-parse";
import remarkRehype, {
	type Options as RemarkRehypeOptions,
} from "remark-rehype";
import { type PluggableList, unified } from "unified";

export interface UseRemarkOptions {
	remarkParseOptions?: RemarkParseOptions;
	remarkPlugins?: PluggableList;
	remarkRehypeOptions?: RemarkRehypeOptions;
	rehypePlugins?: PluggableList;
	rehypeReactOptions?: Pick<RehypeReactOptions, "components">;
	onError?: (err: Error) => void;
}

export default function useMarkdown(
	markdown: string,
	{
		remarkParseOptions,
		remarkPlugins = [],
		remarkRehypeOptions,
		rehypePlugins = [],
		rehypeReactOptions,
		onError = () => {},
	}: UseRemarkOptions = {},
): [React.ReactElement | null] {
	const [content, setContent] = useState<React.ReactElement | null>(null);
	const [isPending, startTransition] = useTransition();

	const processor = useMemo(
		() =>
			unified()
				.use(remarkParse, remarkParseOptions)
				// .use(remarkBreaks)
				.use(remarkGfm)
				.use(remarkMath)
				.use(rehypeKatex)
				.use(remarkPlugins)
				.use(remarkRehype, remarkRehypeOptions)
				.use(rehypePlugins)
				.use(rehypeReact, {
					...rehypeReactOptions,
					ignoreInvalidStyle: true,
					Fragment: jsxRuntime.Fragment,
					jsx: jsxRuntime.jsx as any,
					jsxs: jsxRuntime.jsxs as any,
				} satisfies RehypeReactOptions),
		[],
	);

	const setMarkdown = useCallback(
		(source: string) => {
			processor
				.process(source)
				.then((vfile: { result: React.ReactElement }) =>
					setContent(vfile.result),
				)
				.catch(onError);
		},
		[processor],
	);

	useEffect(() => {
		startTransition(() => {
			setMarkdown(markdown);
		});
	}, [markdown]);

	return [content];
}
