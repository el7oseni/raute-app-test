import { Suspense } from "react"
import ClientOrderDetails from "./client-page"

export default function OrderDetailsPage({ searchParams }: { searchParams: { id?: string } }) {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ClientOrderDetails orderId={searchParams.id || null} />
        </Suspense>
    )
}
