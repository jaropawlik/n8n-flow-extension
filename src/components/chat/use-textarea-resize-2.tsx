
Install component


npm

npx
shadcn@latest add
https://21st.dev/r/Alwurts/chat-input?api_key=eyJhbGciOiJSUzI1NiIsImNhdCI6ImNsX0I3ZDRQRDIyMkFBQSIsImtpZCI6Imluc18ybXdGd3U1cW5FQXozZ1U2dmxnMW13ZU1PZEoiLCJ0eXAiOiJKV1QifQ.eyJhenAiOiJodHRwczovLzIxc3QuZGV2IiwiZXhwIjoxNzQ5MzMyODE1LCJpYXQiOjE3NDkzMzE5MTUsImlzcyI6Imh0dHBzOi8vY2xlcmsuMjFzdC5kZXYiLCJqdGkiOiJiZjIzMzM0YzJkNGNkMmQ0MmQ4YyIsIm5iZiI6MTc0OTMzMTkxMCwic3ViIjoidXNlcl8yeGpjZTY2VkpIOVVXeWJtYjU4Z3hsRVFMOW4ifQ.KWDIWPvtIqskhRIy7253hPmTErXyjo6B6p-V1j8PxWVD5ymtaZ26UfwAjGvdxOh9tgUogFTBxLlbknkdgtaC9Iw_YtuH10mgFRhtFIu4S6iN-ULsGa9NyHc8toXml0_uby--C-4tCF5Jbhawv3Yma2ewIJXWqOXrFnnqGuxPQj9_jWsuCBVu8tzSRPUB6hco73YPHPm3ZocgEMz5bWi2d5KBn5FxpP2YeaTWo-OfFUItqhWcrL8BVZ2mUF4huE4wLm2Elng_UfrrVfVylwuuwULGyMX-2r_gJ5QtFgioPZJ49SYqnZtRwG7KnA2jum_JNKTsleU40NQ9IDAKKNnG3A

Copy Code
⌘C
demo.tsx
chat-input.tsx
button.tsx
textarea.tsx
use-textarea-resize.tsx
use-textarea-resize.tsx
"use client";

import { useLayoutEffect, useRef } from "react";
import type { ComponentProps } from "react";

export function useTextareaResize(
	value: ComponentProps<"textarea">["value"],
	rows = 1,
) {
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useLayoutEffect(() => {
		const textArea = textareaRef.current;

		if (textArea) {
			// Get the line height to calculate minimum height based on rows
			const computedStyle = window.getComputedStyle(textArea);
			const lineHeight = Number.parseInt(computedStyle.lineHeight, 10) || 20;
			const padding =
				Number.parseInt(computedStyle.paddingTop, 10) +
				Number.parseInt(computedStyle.paddingBottom, 10);

			// Calculate minimum height based on rows
			const minHeight = lineHeight * rows + padding;

			// Reset height to auto first to get the correct scrollHeight
			textArea.style.height = "0px";
			const scrollHeight = Math.max(textArea.scrollHeight, minHeight);

			// Set the final height
			textArea.style.height = `${scrollHeight + 2}px`;
		}
	}, [textareaRef, value, rows]);

	return textareaRef;
}
