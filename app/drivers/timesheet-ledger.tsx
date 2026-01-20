'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Construction } from "lucide-react"

export function TimesheetLedger() {
    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Timesheets & Ledger</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Construction className="h-12 w-12 mb-4 opacity-50" />
                <p>No timesheets recorded for this period.</p>
                <p className="text-sm">Driver payment records will appear here.</p>
            </CardContent>
        </Card>
    )
}
