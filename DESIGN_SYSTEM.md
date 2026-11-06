# Live Workspace — Official UI Design System Specification

> Extracted and aligned directly with Stitch Project `15420643849176616123` (Live Workspace SaaS Design System).

---

## 1. Visual Identity & Design Direction

Live Workspace is a modern, light-mode enterprise SaaS collaboration and ticketing platform designed for speed, clarity, and operational rigor.

- **Primary Canvas**: Clean white content areas (`#FFFFFF`) against a soft lavender canvas (`#F5F4FC`) and subtle main background (`#F9F9FB`).
- **Brand Purple**: Vivid signature purple (`#6848E8`) representing action, focus, and modern engineering tooling.
- **Elevation & Depth**: Subtle borders (`#E5E5EF`) and minimal box shadows, avoiding visual noise.
- **Information Density**: 8-point spacing grid allowing clear visual hierarchy for data-dense dashboards, tables, boards, and drawers.

---

## 2. Color Palette & Semantic Tokens

### Official Brand Colors
| Token | Hex Value | Role / Usage |
| :--- | :--- | :--- |
| `primary` | `#6848E8` | Primary brand identifier, key active states, selection pills |
| `btn-primary` | `#6040F0` | Primary interactive buttons and CTA controls |
| `primary-hover`| `#5639D8` | Hover interaction state for primary buttons |
| `primary-light`| `#8870F0` | Soft highlight, active item background tint |
| `lavender` | `#AFA7DB` | Subtle accent highlights and secondary badges |

### Canvas & Surfaces
| Token | Hex Value | Role / Usage |
| :--- | :--- | :--- |
| `canvas-main` | `#F9F9FB` | Global viewport background |
| `canvas-lavender`| `#F5F4FC` | Auth container background, elevated workspace canvas |
| `surface-sidebar`| `#F8F8FC` | Collapsible left navigation sidebar |
| `surface-card` | `#FFFFFF` | Cards, modals, drawers, table rows |
| `border-subtle`| `#E5E5EF` | Standard card, divider, and input border |

### Typography Colors
| Token | Hex Value | Role / Usage |
| :--- | :--- | :--- |
| `text-primary` | `#141529` | High-contrast headings, primary content, table cell text |
| `text-secondary`| `#5C5C70` | Secondary labels, descriptions, metadata |
| `text-muted` | `#9C9CA9` | Timestamps, placeholders, disabled states |

### Ticket Severity (Strictly Separated from Status)
| Severity | Hex Value | Indicator / SLA Association |
| :--- | :--- | :--- |
| **Blocker** | `#F55354` | Highest priority, immediate SLA escalation (15m response) |
| **Critical**| `#F8A040` | Major incident, high-urgency SLA (1h response) |
| **Major** | `#F8C048` | Standard functional defect, normal SLA (4h response) |

### Ticket Workflow Statuses
| Status | Hex Value | Workflow Stage |
| :--- | :--- | :--- |
| **Open** | `#3888F8` | Freshly reported, pending triage or initial response |
| **Work in Progress (WIP)** | `#6848E8` | Currently being actively worked on by assignee |
| **On Hold** | `#F8A040` | Blocked by external dependency or awaiting feedback |
| **Resolved** | `#28C078` | Fix deployed and verified, waiting for close approval |
| **Closed** | `#9C9CA9` | Terminal state, archived and logged |

---

## 3. Typography Scale

- **Headings Font**: `Plus Jakarta Sans` (weights: 600 SemiBold, 700 Bold, 800 ExtraBold)
- **Body & Controls Font**: `Inter` (weights: 400 Regular, 500 Medium, 600 SemiBold)

| Type Token | Font Family | Size | Weight | Line Height | Letter Spacing |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `headline-xl` | Plus Jakarta Sans | 32px | 700 | 400px | -0.02em |
| `headline-xl-mobile` | Plus Jakarta Sans | 26px | 700 | 34px | -0.02em |
| `headline-lg` | Plus Jakarta Sans | 24px | 700 | 32px | -0.015em |
| `headline-md` | Plus Jakarta Sans | 20px | 600 | 28px | -0.01em |
| `headline-sm` | Plus Jakarta Sans | 16px | 600 | 24px | Normal |
| `body-lg` | Inter | 16px | 400 | 24px | Normal |
| `body-md` | Inter | 14px | 400 | 20px | Normal |
| `body-sm` | Inter | 12px | 400 | 16px | Normal |
| `label-lg` | Inter | 14px | 600 | 20px | Normal |
| `label-md` | Inter | 12px | 600 | 16px | 0.01em |
| `label-sm` | Inter | 11px | 600 | 14px | 0.02em |

---

## 4. Spacing & Grid System

Built upon an 8pt base grid:
- `space-xs`: 0.25rem (4px)
- `space-sm`: 0.5rem (8px)
- `space-md`: 1.0rem (16px)
- `space-lg`: 1.5rem (24px)
- `space-xl`: 2.0rem (32px)
- `space-2xl`: 3.0rem (48px)
- `gutter`: 1.5rem (24px)
- `margin`: 2.0rem (32px)

### Border Radii
- `sm`: 0.25rem (4px) — Small badges, inline tags
- `DEFAULT`: 0.5rem (8px) — Standard inputs, buttons, table cards
- `md`: 0.75rem (12px) — Workspace cards, action popovers
- `lg`: 1.0rem (16px) — Modals, contextual drawers
- `xl`: 1.5rem (24px) — Feature containers
- `full`: 9999px — Avatars, status pills

---

## 5. Signature UI Pattern Rules

1. **Dual SLA Timers**:
   - Tickets must always present two distinct timers: **First Response Time** and **Resolution Time**.
   - Timers render dynamic color states: Normal (`#5C5C70`), Warning (<20% remaining: `#F8A040`), Breached (`#F55354`).
2. **Contextual Right Drawers**:
   - Task and Ticket detail views default to a slide-over right drawer (width: 520px - 640px) allowing the user to preserve context on the list/kanban board.
3. **Centered Creation Modals**:
   - Quick creation workflows (Create Task, Create Ticket, Create Project, Invite Member) render as clean, centered backdrop modals (max width: 560px).
4. **Persistent Fixed Collapsible Sidebar**:
   - 256px expanded, 72px icon-collapsed, state saved in localStorage.
5. **Global Quick Action (+) Button**:
   - Prominently positioned in top bar navigation allowing 1-click creation of any workspace entity.
