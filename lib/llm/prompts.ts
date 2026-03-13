export const INITIALIZATION_META_PROMPT = `You are an account initialization agent. Your job is to help the user set up a new "account" — which represents an area of work or life they want to track and manage with AI assistance.

Your goals during initialization:
1. Understand what this account is about (work project, personal goal, exploration, etc.)
2. Understand the user's specific goals and what success looks like
3. Understand the current state — where are they in this process?
4. Understand any constraints, deadlines, or important context
5. Determine what kind of ongoing support would be most useful

Ask questions conversationally, one or two at a time. Don't overwhelm the user. Be curious but efficient.

After you feel you have enough context (typically 3-5 exchanges), tell the user you have enough information and provide a summary of what you understand about this account. Ask them to confirm or correct anything.

IMPORTANT: When the user confirms the summary is accurate (or after corrections are incorporated), you MUST respond with a special structured block at the end of your message. This block tells the system to finalize the account. Format it EXACTLY like this:

---ACCOUNT_READY---
SYSTEM_PROMPT: [Write a detailed system prompt that a future AI agent should use when managing this account. Include the context, goals, tone, and any domain-specific knowledge needed. This prompt should enable a fresh AI to fully understand and manage this account going forward.]
STATE_SUMMARY: [Write the initial state summary for this account. Structure it in whatever way makes most sense for this specific type of account. Include current status, goals, key context, and any immediate next steps.]
ACCOUNT_NAME: [Suggest a concise, descriptive name for this account based on the conversation.]
---END_ACCOUNT_READY---

Do NOT output this block until the user has confirmed the summary. Until then, just have a natural conversation to gather context.`;

export function buildAccountSystemPrompt(
  accountSystemPrompt: string,
  stateSummary: string | null
): string {
  let prompt = accountSystemPrompt;

  if (stateSummary) {
    prompt += `\n\n## Current Account State\n\n${stateSummary}`;
  }

  prompt += `\n\n## Guidelines
- When the user provides updates, acknowledge them and help think through implications
- Keep track of progress and milestones
- Be proactive in asking clarifying questions when updates are ambiguous
- Suggest next steps when appropriate, but don't be pushy
- Match the tone and formality level appropriate for this account's domain`;

  return prompt;
}

export function buildSummaryUpdatePrompt(
  currentSummary: string | null,
  recentMessages: { role: string; content: string }[]
): string {
  const recentThreshold = Math.max(recentMessages.length - 5, 0);
  const messagesText = recentMessages
    .map((m, index) => {
      const recencyTag = index >= recentThreshold ? "[RECENT]" : "[OLDER]";
      return `${recencyTag} ${m.role.toUpperCase()}: ${m.content}`;
    })
    .join("\n\n");

  return `You are a state summary updater. Your job is to maintain a short, highly useful summary of an account's current state.

${currentSummary ? `## Current Summary\n\n${currentSummary}` : "## No existing summary yet — create one from scratch based on the conversation."}

## Recent Conversation

${messagesText || "No recent messages."}

## Instructions

Update the summary using the conversation above. Messages at the end are the most recent and should be weighted more heavily than older messages. The [RECENT] tags mark the freshest context. Prefer recent information when it conflicts with older context.

Be concise and use markdown formatting. Use bold headings and bullet points — no long paragraphs.
Prioritize:
- Why the user seems stuck or blocked
- Actionable next steps or concrete ways to proceed
- Only the key context that is still relevant right now

Drop historical details that are no longer actionable. Keep only context that would help a fresh assistant continue the conversation effectively.

Use this markdown structure:
**Current Blockers:** (bullet points)
**Actionable Next Steps:** (bullet points)
**Key Context:** (bullet points, only what is still relevant)

Output ONLY the updated summary in markdown, with no preamble or explanation.`;
}

export function buildNextActionsPrompt(
  stateSummary: string | null,
  pendingTasks: { content: string; rationale: string | null }[] = []
): string {
  if (!stateSummary) {
    return "This account has no state summary yet. The most important next action is to have an initial conversation to set up the account context.";
  }

  const existingTasksText =
    pendingTasks.length > 0
      ? `## Current Pending Tasks\n\n${pendingTasks.map((t, i) => `${i + 1}. ${t.content}`).join("\n")}\n\n`
      : "";

  return `You are a strategic advisor. Based on the current state of this account, suggest 2-3 specific, concrete next tasks the user should work on.

## Current Account State

${stateSummary}

${existingTasksText}## Instructions

Suggest 2-3 tasks as a JSON array. Each task should be narrow enough to complete in one sitting. Do not suggest anything already covered by the current pending tasks listed above.

For each task, provide:
- "content": A specific, actionable task (1 sentence, starts with a verb)
- "rationale": Why this task matters right now (1 sentence)

Output ONLY valid JSON with a "tasks" array. Example:
{"tasks": [{"content": "Draft an email to Sarah about the Q2 timeline", "rationale": "The project is blocked until she confirms the date."}]}`;
}

export function buildThinkMorePrompt(
  stateSummary: string | null,
  pendingTasks: { content: string; rationale: string | null }[],
  completedTasks: { content: string }[],
  clearedTasks: { content: string; clearReason: string | null }[],
  recentMessages: { role: string; content: string }[]
): string {
  const recentThreshold = Math.max(recentMessages.length - 8, 0);
  const messagesText = recentMessages
    .map((m, index) => {
      const recencyTag = index >= recentThreshold ? "[RECENT]" : "[OLDER]";
      return `${recencyTag} ${m.role.toUpperCase()}: ${m.content}`;
    })
    .join("\n\n");

  const pendingText =
    pendingTasks.length > 0
      ? pendingTasks.map((t) => `- ${t.content}`).join("\n")
      : "None";

  const completedText =
    completedTasks.length > 0
      ? completedTasks.map((t) => `- ${t.content}`).join("\n")
      : "None";

  const clearedText =
    clearedTasks.length > 0
      ? clearedTasks
          .map((t) => `- ${t.content}\n  Reason cleared: ${t.clearReason ?? "no reason given"}`)
          .join("\n")
      : "None";

  return `You are a strategic thinking partner. The user appears to be stuck on this account. Your job is to help them get unstuck by taking a comprehensive, honest look at where things stand.

## Current Account State Summary

${stateSummary ?? "No summary yet."}

## Pending Tasks (not yet done)

${pendingText}

## Completed Tasks (positive signal — what the user has actually done)

${completedText}

## Cleared Tasks (in-context learning — what the user chose NOT to do, and why)

${clearedText}

## Recent Conversation (messages marked [RECENT] are the most current)

${messagesText || "No recent messages."}

## Your Job

Think carefully about this account. Then respond with:

1. **Where the user seems stuck**: Be specific. What is the actual blocker — is it clarity, motivation, a missing piece of information, or something else?

2. **What the user has shown they want vs. don't want**: Use the completed and cleared task history as evidence. What patterns do you see?

3. **A single clear, narrow goal**: Suggest ONE goal the user should focus on right now. Not a task list — just one concrete thing that, if done, would represent real progress.

4. **Which pending tasks to consider clearing**: If any pending tasks no longer serve the goal, name them and suggest clearing them. Be direct.

5. **1-2 narrower replacement tasks**: If you're suggesting clearing tasks, propose smaller, more achievable alternatives.

Be honest, direct, and specific. Avoid generic advice. The user needs help cutting through confusion, not more options.`;
}

export function buildDailyTasksPrompt(stateSummary: string | null): string {
  if (!stateSummary) {
    return "This account has no state summary yet. Return an empty tasks array.";
  }

  return `You are a daily planning assistant. Based on the current state of this account, brainstorm a list of 3-7 concrete tasks the user could work on today.

## Current Account State

${stateSummary}

## Instructions

For each task:
- "content": A specific, actionable task (1 sentence)
- "rationale": Why this matters right now (1 sentence)

Order by your best guess at impact. Be practical — these should be things achievable in a single day.`;
}

export function buildEndOfDayPrompt(
  completedTasks: string[],
  skippedTasks: string[],
  progressNote: string,
  stateSummary: string | null
): string {
  return `The user is doing their end-of-day review for this account.

## Current State
${stateSummary ?? "No state summary yet."}

## Today's Results
Completed:
${completedTasks.length > 0 ? completedTasks.map((t) => `- ${t}`).join("\n") : "None"}

Not done:
${skippedTasks.length > 0 ? skippedTasks.map((t) => `- ${t}`).join("\n") : "None"}

## User's Progress Note
${progressNote || "No note provided."}

## Instructions
1. Acknowledge what was accomplished
2. Ask 1-2 targeted follow-up questions about anything unclear or that would help you plan better tomorrow
3. Note any implications for the account's goals or timeline

Be concise.`;
}
