---
applyTo: "**/*.ts,**/*.tsx"
---
# Project coding standards for TypeScript and React

Apply the [general coding guidelines](./general-coding.instructions.md) to all code.

## TypeScript Guidelines
- Use TypeScript for all new code
- Follow functional programming principles where possible
- Use interfaces for data structures and type definitions
- Prefer immutable data (const, readonly)
- Use optional chaining (?.) and nullish coalescing (??) operators

## React Guidelines
- Use functional components with hooks
- Follow the React hooks rules (no conditional hooks)
- Use React.FC type for components with children
- Keep components small and focused
- Use Tailwind CSS for styling
- Use `useMemo` and `useCallback` to optimize performance
- Use `useEffect` for side effects, with proper dependency arrays
- Use `useState` for local state management

## UI Framework
- Use shadcn for UI components, they already exists, do not recreate them, import them.
- You should not use hard coded color tokens if possible
- Use Lucide icons for icons

## Code Quality
- For React components, split logic into smaller subcomponents
- You can place these subcomponents in the same file if they are small enough, I will split them later if needed