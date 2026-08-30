import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server otherwise regenerates AGENTS.md and CLAUDE.md on every run;
  // they are tooling scaffolding, not part of this submission.
  agentRules: false,
};

export default nextConfig;
