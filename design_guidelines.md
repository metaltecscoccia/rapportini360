# Daily Work Report Management App - Design Guidelines

## Design Approach
**Utility-Focused Design System Approach** - This application prioritizes efficiency and usability for daily work tasks. Drawing inspiration from productivity tools like Linear and Notion, with emphasis on clean data entry and clear administrative workflows.

## Core Design Elements

### A. Color Palette
**Primary Colors:**
- Dark mode: 220 15% 95% (light text)
- Light mode: 220 15% 15% (dark text)
- Background dark: 220 15% 8%
- Background light: 220 15% 98%

**Accent Colors:**
- Success (approved reports): 142 76% 36%
- Warning (pending reports): 38 92% 50%
- Primary action: 217 91% 60%

### B. Typography
- **Primary Font:** Inter (Google Fonts)
- **Headers:** font-semibold (600) for section titles
- **Body:** font-normal (400) for content
- **Labels:** font-medium (500) for form labels
- **Sizes:** text-sm for labels, text-base for inputs, text-lg for headers

### C. Layout System
**Spacing Units:** Consistent use of Tailwind units 2, 4, 6, and 8
- Form spacing: p-4, gap-4
- Section spacing: p-6, mb-8
- Component margins: m-2, mt-4

### D. Component Library

**Mobile Employee Interface:**
- **Daily Report Cards:** Clean white/dark cards with rounded-lg borders
- **Operation Entry Forms:** Stacked layout with full-width inputs
- **Dropdown Menus:** Native mobile-friendly selectors with clear labels
- **Time Input:** Number inputs with clear hour indicators
- **Status Badges:** Rounded-full badges with appropriate color coding

**Desktop Admin Interface:**
- **Data Tables:** Stripe pattern with hover states for row scanning
- **Filter Panels:** Sidebar or top-bar filters with clear reset options
- **Report Cards:** Grid layout with expandable details
- **Action Buttons:** Primary (solid) for approve, secondary (outline) for edit

**Navigation:**
- **Mobile:** Bottom tab navigation for employees
- **Desktop:** Sidebar navigation for admin with collapsible sections

### E. User Experience Patterns

**Employee Workflow:**
- Single-page report creation with progressive disclosure
- Auto-save drafts functionality indication
- Clear visual hierarchy: Client → Commessa → Work Type → Hours
- Prominent submit button with confirmation states

**Admin Workflow:**
- Dashboard overview with key metrics cards
- Batch operations for report approval
- Quick-filter chips for common searches
- Expandable report details without page navigation

**Form Design:**
- Grouped related fields with subtle background differentiation
- Required field indicators with asterisks
- Inline validation with clear error messaging
- Mobile-optimized touch targets (minimum 44px)

## Key Design Principles
1. **Mobile-First:** Employee interface optimized for smartphone data entry
2. **Information Density:** Admin interface balances detail with scannability
3. **Status Clarity:** Visual indicators for report states throughout the interface
4. **Workflow Efficiency:** Minimize clicks and cognitive load for daily tasks
5. **Consistent Patterns:** Unified component behavior across user roles

## Images
No hero images required. This is a utility application focusing on clean interface design with occasional small icons for work types (cutting, welding, assembly) using Heroicons library.