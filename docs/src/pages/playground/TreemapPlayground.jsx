import React from "react"
import { Treemap } from "semiotic"
import PlaygroundLayout from "../../components/PlaygroundLayout"

// ---------------------------------------------------------------------------
// Control schema
// ---------------------------------------------------------------------------

const controls = [
  { name: "colorByDepth", type: "boolean", label: "Color by Depth", group: "Color",
    default: false },
  { name: "showLabels", type: "boolean", label: "Show Labels", group: "Labels",
    default: true },
  { name: "enableHover", type: "boolean", label: "Enable Hover", group: "Interaction",
    default: true },
  { name: "title", type: "string", label: "Title", group: "Labels",
    default: "" },
]

// ---------------------------------------------------------------------------
// Datasets
// ---------------------------------------------------------------------------

const fileSystemData = {
  name: "project",
  children: [
    {
      name: "src",
      children: [
        {
          name: "components",
          children: [
            { name: "Header.tsx", value: 1200 },
            { name: "Sidebar.tsx", value: 980 },
            { name: "Footer.tsx", value: 450 },
            { name: "Modal.tsx", value: 720 },
            { name: "Table.tsx", value: 1540 },
          ],
        },
        {
          name: "hooks",
          children: [
            { name: "useAuth.ts", value: 340 },
            { name: "useQuery.ts", value: 580 },
            { name: "useTheme.ts", value: 210 },
          ],
        },
        {
          name: "utils",
          children: [
            { name: "format.ts", value: 420 },
            { name: "validate.ts", value: 610 },
            { name: "api.ts", value: 890 },
          ],
        },
      ],
    },
    {
      name: "docs",
      children: [
        { name: "getting-started.md", value: 2200 },
        { name: "api-reference.md", value: 3800 },
        { name: "examples.md", value: 1500 },
        { name: "changelog.md", value: 950 },
      ],
    },
    {
      name: "tests",
      children: [
        { name: "unit", children: [
          { name: "components.test.ts", value: 1800 },
          { name: "hooks.test.ts", value: 920 },
          { name: "utils.test.ts", value: 750 },
        ]},
        { name: "integration", children: [
          { name: "auth.test.ts", value: 1100 },
          { name: "api.test.ts", value: 1350 },
        ]},
      ],
    },
  ],
}

const departmentData = {
  name: "Company",
  children: [
    {
      name: "Engineering",
      children: [
        {
          name: "Frontend",
          children: [
            { name: "Web App", value: 12 },
            { name: "Mobile App", value: 8 },
            { name: "Design System", value: 4 },
          ],
        },
        {
          name: "Backend",
          children: [
            { name: "API Team", value: 10 },
            { name: "Data Pipeline", value: 6 },
            { name: "Infrastructure", value: 7 },
          ],
        },
        {
          name: "QA",
          children: [
            { name: "Manual QA", value: 5 },
            { name: "Automation", value: 4 },
          ],
        },
      ],
    },
    {
      name: "Product",
      children: [
        { name: "Product Managers", value: 6 },
        { name: "UX Research", value: 4 },
        { name: "UX Design", value: 8 },
      ],
    },
    {
      name: "Operations",
      children: [
        { name: "HR", value: 5 },
        { name: "Finance", value: 4 },
        { name: "Legal", value: 3 },
        { name: "Office Mgmt", value: 2 },
      ],
    },
    {
      name: "Sales & Marketing",
      children: [
        { name: "Sales", value: 15 },
        { name: "Marketing", value: 9 },
        { name: "Customer Success", value: 7 },
      ],
    },
  ],
}

const datasets = [
  {
    label: "File System Hierarchy (project directory)",
    data: fileSystemData,
    codeString: `{
  name: "project",
  children: [
    { name: "src", children: [
      { name: "components", children: [
        { name: "Header.tsx", value: 1200 },
        { name: "Table.tsx", value: 1540 },
        // ...5 files
      ]},
      { name: "hooks", children: [...] },
      { name: "utils", children: [...] },
    ]},
    { name: "docs", children: [...] },
    { name: "tests", children: [...] },
  ],
}`,
  },
  {
    label: "Department Org Chart (headcount)",
    data: departmentData,
    codeString: `{
  name: "Company",
  children: [
    { name: "Engineering", children: [
      { name: "Frontend", children: [
        { name: "Web App", value: 12 },
        { name: "Mobile App", value: 8 },
        // ...
      ]},
      { name: "Backend", children: [...] },
      { name: "QA", children: [...] },
    ]},
    { name: "Product", children: [...] },
    { name: "Operations", children: [...] },
    { name: "Sales & Marketing", children: [...] },
  ],
}`,
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function TreemapPlayground() {
  return (
    <PlaygroundLayout
      title="Treemap Playground"
      breadcrumbs={[
        { label: "Playground", path: "/playground" },
        { label: "Treemap", path: "/playground/treemap" },
      ]}
      prevPage={{ title: "Donut Chart Playground", path: "/playground/donut-chart" }}
      nextPage={{ title: "Circle Pack Playground", path: "/playground/circle-pack" }}
      chartComponent={Treemap}
      componentName="Treemap"
      controls={controls}
      datasets={datasets}
      dataProps={(ds) => ({
        data: ds.data,
        childrenAccessor: "children",
        valueAccessor: "value",
        height: 500,
      })}
    >
      <p>
        Experiment with Treemap props in real time. Treemaps use nested
        rectangles to represent hierarchical data, where each rectangle's area is
        proportional to its value. They are excellent for visualizing file sizes,
        budget allocations, and organizational structures. Toggle color-by-depth
        to distinguish hierarchy levels at a glance.
      </p>
    </PlaygroundLayout>
  )
}
