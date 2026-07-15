'use client'

import * as React from "react"
import { cn } from "@/lib/utils"

/**
 * Table — responsive table primitive.
 *
 * Phase 2 design-system primitive. Replaces ad-hoc <table> + custom CSS patterns.
 *
 * Desktop: standard <table> with daisyUI .table classes
 * Mobile (≤768px): collapses to card layout — each row becomes a card with
 * label/value pairs. The header row is hidden on mobile.
 *
 * Parts:
 *   Table → TableHeader → TableRow → TableHead
 *       → TableBody → TableRow → TableCell
 *       → TableFooter → TableRow → TableCell
 *
 * Usage:
 *   <Table>
 *     <TableHeader>
 *       <TableRow>
 *         <TableHead>Substance</TableHead>
 *         <TableHead>Amount</TableHead>
 *         <TableHead>Time</TableHead>
 *       </TableRow>
 *     </TableHeader>
 *     <TableBody>
 *       {doses.map(dose => (
 *         <TableRow key={dose.id}>
 *           <TableCell>{dose.substanceName}</TableCell>
 *           <TableCell>{dose.amount} {dose.unit}</TableCell>
 *           <TableCell>{formatTime(dose.timestamp)}</TableCell>
 *         </TableRow>
 *       ))}
 *     </TableBody>
 *   </Table>
 *
 * Responsive behavior:
 * - TableCell accepts a `label` prop for the mobile card layout
 * - On mobile, the label is shown as a dt/dd pair inside each row-card
 * - On desktop, the label is hidden (header row provides context)
 */
const Table = React.forwardRef<
  HTMLTableElement,
  React.TableHTMLAttributes<HTMLTableElement> & { variant?: "default" | "compact" }
>(({ className, variant = "default", children, ...props }, ref) => (
  <div className="overflow-x-auto">
    <table
      ref={ref}
      className={cn(
        "table w-full",
        variant === "compact" && "table-compact",
        className
      )}
      {...props}
    >
      {children}
    </table>
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, children, ...props }, ref) => (
  <thead ref={ref} className={cn("hidden md:table-header-group", className)} {...props}>
    {children}
  </thead>
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, children, ...props }, ref) => (
  <tbody ref={ref} className={cn("divide-y divide-base-300", className)} {...props}>
    {children}
  </tbody>
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, children, ...props }, ref) => (
  <tfoot ref={ref} className={cn("hidden md:table-footer-group", className)} {...props}>
    {children}
  </tfoot>
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & { mobileCard?: boolean }
>(({ className, mobileCard = true, children, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "md:table-row",
      mobileCard && "md:hidden block rounded-lg border border-base-300 bg-base-100 p-3 mb-2",
      className
    )}
    {...props}
  >
    {children}
  </tr>
))
TableRow.displayName = "TableRow"

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Visible on mobile as the row card's section label */
  mobileLabel?: string
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, mobileLabel, children, ...props }, ref) => (
    <th
      ref={ref}
      scope="col"
      className={cn(
        "table-cell font-semibold text-sm text-neutral-content bg-base-200/50 sticky top-0 z-10",
        className
      )}
      {...props}
    >
      {children}
      {mobileLabel && (
        <span className="md:hidden block text-xs text-neutral-content/60 mt-0.5">
          {mobileLabel}
        </span>
      )}
    </th>
  )
)
TableHead.displayName = "TableHead"

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  /** Label shown in mobile card layout (hidden on desktop) */
  label?: string
  /** Force this cell to render as a full-width row in mobile card mode */
  fullWidth?: boolean
}

const TableCell = React.forwardRef<HTMLTableCellElement, TableCellProps>(
  ({ className, label, fullWidth, children, ...props }, ref) => (
    <td
      ref={ref}
      className={cn(
        "table-cell text-sm",
        fullWidth && "md:table-cell md:hidden block w-full py-1",
        className
      )}
      {...props}
    >
      {label && (
        <div className="md:hidden flex items-center gap-2 py-1 text-xs">
          <dt className="font-medium text-neutral-content/70 shrink-0 w-24 truncate">
            {label}
          </dt>
          <dd className="flex-1 text-neutral-content min-w-0">{children}</dd>
        </div>
      )}
      {!label && children}
      {label && (
        <div className="hidden md:table-cell">{children}</div>
      )}
    </td>
  )
)
TableCell.displayName = "TableCell"

/**
 * MobileCardRow — convenience component for complex mobile card layouts.
 * Use inside TableBody when the mobile layout needs more structure than
 * simple label/value pairs.
 */
interface MobileCardRowProps {
  children: React.ReactNode
  className?: string
}

export function MobileCardRow({ children, className }: MobileCardRowProps) {
  return (
    <div className={cn("md:hidden space-y-2", className)}>
      {children}
    </div>
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
}