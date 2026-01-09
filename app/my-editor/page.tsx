import { Suspense } from "react"
import ClientOrderDetails from "./client-page"

export default function OrderDetailsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ClientOrderDetails />
        </Suspense>
    )
}
