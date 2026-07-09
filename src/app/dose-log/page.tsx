'use client'

import { Suspense } from 'react'
import { DoseLoggerModal } from '@/components/dose-logger-modal'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

function DoseLogPageContent() {
  return (
    <div className="container mx-auto py-6 lg:py-10 px-4 lg:px-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Log a Dose</h1>
          <p className="text-neutral-content text-sm mt-1">
            Record your substance use for tracking and harm reduction
          </p>
        </div>
        <DoseLoggerModal
          trigger={
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Dose
            </Button>
          }
        />
      </div>

      <div className="card card-transparent p-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="p-4 rounded-full bg-primary/10">
            <Plus className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Ready to log</h3>
          <p className="text-sm text-neutral-content max-w-sm">
            Click the &quot;New Dose&quot; button above to open the dose logger.
            You can quickly search for substances by name or use the quick input
            field for rapid logging.
          </p>
        </div>
      </div>
    </div>
  )
}

export default function DoseLogPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <DoseLogPageContent />
    </Suspense>
  )
}
