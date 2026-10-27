import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import type { Edge } from "@xyflow/react"
import type { StepNodeType } from "@/features/workflows/nodes/node-registry"

export type WorkflowGraph = { nodes: StepNodeType[]; edges: Edge[] }
export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: text("org_id").notNull(),
  name: text("name").notNull(),
  graph: jsonb("graph").$type<WorkflowGraph>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

export type Workflow = typeof workflows.$inferSelect
