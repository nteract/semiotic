// Editorial product profiles, not accepted service agreements or runtime policy.
export type ProductUse = {
  id: string
  label: string
  audience: string
  task: string
  valueNow: string
  learning: string
  benefits: string[]
  commitment: {
    mustWork: string
    tolerableRoughEdges: string
    response: string
    stopOrFallback: string
  }
  details: {
    context: string
    limitations: string
    ownerRole: string
    reviewBeforeStrongerUse: string
  }
}

export const niches: ProductUse[] = [
  {
    id: "plugins",
    label: "Design plugin",
    audience: "Designers and PMs composing a screen",
    task: "Fit a chart into a real design.",
    valueNow:
      "Compose a chart with sample data inside a familiar design workflow, without building an application first.",
    learning:
      "A narrow card exposes crowded labels or an awkward default. A reproducible layout finding helps the library, browser panels, and later exports.",
    benefits: ["Browser panels", "Static exports", "Shared defaults"],
    commitment: {
      mustWork: "The chart preserves the data’s meaning and the original design remains available.",
      tolerableRoughEdges:
        "Recoverable layout or export defects are tolerable during an explicitly experimental composition task.",
      response:
        "Report the chart and its dimensions through the plugin’s issue path. During a facilitated session, the maintainer helps recover the work.",
      stopOrFallback:
        "Switch to the preserved design if an export fails. Stop using misleading output; repair or remove the affected case before reuse.",
    },
    details: {
      context:
        "A static chart placed in a design tool. This page illustrates that task; it does not run a Figma plugin.",
      limitations:
        "Static output cannot establish browser interaction or keyboard behavior. Preserve units, relevant annotations, and an accessible explanation.",
      ownerRole: "Plugin maintainer and session facilitator",
      reviewBeforeStrongerUse:
        "The receiving application still needs implementation, interaction, accessibility, and integration review.",
    },
  },
  {
    id: "communications",
    label: "Team report",
    audience: "Colleagues reading a team update or email report",
    task: "Understand a result without opening an app.",
    valueNow:
      "A dated chart and explanation bring a useful finding into the conversation where a team makes sense of its work.",
    learning:
      "Questions about units, captions, and time state reveal meaning that the interactive interface left implicit. Better context helps reports and application screens.",
    benefits: ["Chart captions", "Export context", "Application explanations"],
    commitment: {
      mustWork:
        "The snapshot communicates its measure, relevant time state, and an accessible text explanation.",
      tolerableRoughEdges:
        "Delayed refresh and static interaction are acceptable for a dated briefing, within its stated purpose.",
      response:
        "Give readers a reply or issue path. The report owner investigates misleading information and corrects the reachable published copy.",
      stopOrFallback:
        "Flag or withdraw misleading output and provide a corrected explanation. Do not present a dated report as live operational status.",
    },
    details: {
      context: "A Slack update, email, or report read outside the live application.",
      limitations:
        "Offline copies cannot all be recalled. A useful briefing does not establish readiness for live incident response.",
      ownerRole: "Report owner, with a library maintainer for shared defects",
      reviewBeforeStrongerUse:
        "Review timeliness, interpretation, and response needs before using the same chart for an operational decision.",
    },
  },
  {
    id: "prototype",
    label: "Internal tool",
    audience: "A PM, facilitator, and participants exploring a product question",
    task: "Find out whether the feature helps with the job.",
    valueNow:
      "Use a working panel to compare service behavior and make a concrete workflow or composition choice.",
    learning:
      "The task reveals an unnecessary interaction, a missing comparison, or an assumption hidden by convenient data. Those findings shape the product before its production review.",
    benefits: ["Product scope", "Interaction design", "Realistic fixtures"],
    commitment: {
      mustWork:
        "The bounded task preserves data meaning, and participants know which actions are supported.",
      tolerableRoughEdges:
        "Manual recovery and unfinished secondary features are acceptable in a facilitated, reversible task.",
      response:
        "The facilitator helps during the session and records confusion or failure alongside the case that produced it.",
      stopOrFallback:
        "Pause a misleading task immediately and use the agreed fallback. Fix or remove the case before another session.",
    },
    details: {
      context:
        "A supervised internal prototype or customer-feedback session with a defined question.",
      limitations:
        "Consequential writes or sensitive decisions need review before use; the word ‘internal’ does not make them low risk.",
      ownerRole: "Facilitator and tool maintainer",
      reviewBeforeStrongerUse:
        "Check actual data, unsupervised use, access, integration, and support before widening the task or audience.",
    },
  },
  {
    id: "examples",
    label: "High-touch example",
    audience: "A reader learning a visualization technique",
    task: "Learn by trying a meaningful case.",
    valueNow:
      "An explained example lets a reader explore a technique, compare alternatives, and understand what the chart is saying.",
    learning:
      "Reader confusion exposes missing explanations and surprising defaults. A useful variation can become documentation, a regression case, or a new feature.",
    benefits: ["Documentation", "Defaults", "Regression examples"],
    commitment: {
      mustWork:
        "The explanation accurately describes the demonstrated behavior and provides an accessible reading.",
      tolerableRoughEdges:
        "A small dataset and limited configurations are sufficient when their scope is clear.",
      response:
        "The example maintainer provides an issue path and investigates a reproducible contradiction between the example and its explanation.",
      stopOrFallback:
        "Correct a misleading explanation or take the affected example out of use until it is repaired.",
    },
    details: {
      context: "A Semiotic story built around a concrete reader task.",
      limitations:
        "Authored states explain an idea. They do not establish executed library behavior or external product adoption.",
      ownerRole: "Example maintainer",
      reviewBeforeStrongerUse:
        "Exercise the intended public APIs with the receiving product’s data and constraints.",
    },
  },
  {
    id: "open-source",
    label: "Open-source experiment",
    audience: "An adopter building an experimental integration",
    task: "Make the capability useful in another environment.",
    valueNow:
      "Build something with a public package, inspect its behavior, and adapt it to a task the original team did not anticipate.",
    learning:
      "Unfamiliar inputs, dependencies, and installation paths expose compatibility gaps and new uses. Reproducible reports improve the shared package.",
    benefits: ["Public interfaces", "Compatibility", "New use cases"],
    commitment: {
      mustWork:
        "Experimental scope, supported imports, known limits, and the issue path are identifiable.",
      tolerableRoughEdges:
        "Narrow compatibility and changing experimental APIs are acceptable within that explicit scope.",
      response:
        "Maintainers triage reproducible reports according to published project support and record the affected versions.",
      stopOrFallback:
        "Pin a working version or withdraw the affected integration when a failure exceeds the experimental scope.",
    },
    details: {
      context:
        "Opt-in use of a public package or adapter, distinct from a supported production release.",
      limitations:
        "Open source can have consequential users. Public availability does not waive release or security responsibilities.",
      ownerRole: "Package and integration maintainers",
      reviewBeforeStrongerUse:
        "Verify installation, dependencies, public API behavior, and a sustainable support path for the receiving product.",
    },
  },
  {
    id: "design-system",
    label: "Design system",
    audience: "Designers and engineers composing an application",
    task: "Reuse a chart configuration that fits the product.",
    valueNow:
      "Shared tokens, defaults, and supported configurations reduce repeated design and integration work.",
    learning:
      "Real screens expose layout constraints, inaccessible combinations, and missing defaults. Those findings improve both the integration and the library where the behavior is shared.",
    benefits: ["Supported configurations", "Accessible defaults", "Library layout"],
    commitment: {
      mustWork:
        "Documented configurations preserve meaning, required access, and the product’s visual conventions.",
      tolerableRoughEdges:
        "A narrow supported configuration set is acceptable; silent regressions in that set are not.",
      response:
        "The integration maintainer investigates reports against the supported version and coordinates a controlled upgrade or repair.",
      stopOrFallback:
        "Hold an upgrade or revert an affected configuration while preserving a supported alternative.",
    },
    details: {
      context: "Maintained chart composition and tokens within an organization’s design system.",
      limitations:
        "Token consistency alone does not establish task usefulness, contrast, or keyboard access.",
      ownerRole: "Design system integration owner",
      reviewBeforeStrongerUse:
        "Review actual screens, supported interactions, upgrade compatibility, and product-specific requirements.",
    },
  },
  {
    id: "beta",
    label: "Opt-in beta",
    audience: "Participants using a developing feature repeatedly",
    task: "Try the feature in an ongoing workflow.",
    valueNow:
      "Participants get useful functionality early, with declared limits and a dependable alternative when the trial fails.",
    learning:
      "Repeated use reveals reliability and integration problems that a single demonstration misses. It also shows whether people continue to find the feature useful.",
    benefits: ["Reliability", "Integration", "Product priorities"],
    commitment: {
      mustWork:
        "The declared task, access, support route, and fallback work for the trial audience.",
      tolerableRoughEdges:
        "Only the limitations participants can reasonably accept under the trial’s stated scope.",
      response:
        "The trial owner provides support during the agreed service window and communicates known failures to affected participants.",
      stopOrFallback:
        "Pause exposure and return participants to the supported alternative if a failure exceeds the trial’s promise.",
    },
    details: {
      context: "An opt-in trial with a defined audience, service window, and recovery route.",
      limitations:
        "Enthusiasm and repeated use do not settle unresolved engineering or access questions.",
      ownerRole: "Trial owner and supporting product team",
      reviewBeforeStrongerUse:
        "Resolve the receiving product’s outstanding reliability, access, operational, and support obligations.",
    },
  },
  {
    id: "production",
    label: "Production product",
    audience: "Customers relying on the supported product task",
    task: "Depend on the feature in everyday work.",
    valueNow:
      "Use the capability under the product’s established release, reliability, accessibility, and support commitments.",
    learning:
      "Operational experience and evolving needs return new requirements to the shared capability and the tools around it.",
    benefits: ["Next library revision", "Earlier-use tools", "Service practices"],
    commitment: {
      mustWork:
        "The behavior and service obligations the receiving product actually promises to its customers.",
      tolerableRoughEdges:
        "Only limitations consistent with that promise; earlier experimental acceptance grants no automatic approval here.",
      response:
        "The product’s accountable owners respond through its accepted support and incident processes.",
      stopOrFallback:
        "Use the product’s rollback, correction, or withdrawal procedure when the supported task cannot be maintained.",
    },
    details: {
      context: "A supported customer application with its own release decision.",
      limitations:
        "Earlier findings inform this review. They do not establish untested host behavior or accept responsibility on the product owner’s behalf.",
      ownerRole: "Receiving product’s engineering and service owners",
      reviewBeforeStrongerUse:
        "Reassess whenever the audience, task, or consequences expand. Production findings continue to improve the ecosystem.",
    },
  },
]
